import { UserPhoto } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import FormData from 'form-data';
import axios from "axios";
import http from "http";
import ssim from 'ssim.js';
import sharp from 'sharp';
import { ImageAnalysisSummary } from "@/types/image-analysis.types";
import { prismaRead, prismaWrite } from "@/lib/prisma";
import { S3Helper } from "@/server-side-helpers/s3.helper";
import { log } from "@/server-side-helpers/logging.helpers";
import _ from "lodash";

const axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100 }),
});

const SIGHTENGINE_MODELS = [
    'nudity-2.1',
    'weapon',
    'recreational_drug',
    'medical',
    'type',
    'offensive-2.0',
    'faces',
    'scam',
    'text-content',
    'face-attributes',
    'gore-2.0',
    'text',
    'qr-content',
    'tobacco',
    'genai',
    'violence',
    'self-harm',
    'gambling'
];

type PhotoWithTempPath = {
    tempFilePath: string,
    s3Path: string,
    imageFile: File,
    isRejected?: boolean,
    messages?: string[],
    hadProcessingError?: boolean
};

/**
 * Represents a photo with its temporary file path and metadata during the review process.
 * @property {string} tempFilePath - The file system path to the temporary image file
 * @property {string} s3Path - The S3 bucket path where the image is or will be stored
 * @property {File} imageFile - The File object for the image
 * @property {boolean} [isRejected] - Whether the photo has been rejected during review
 * @property {string[]} [messages] - Array of rejection or status messages
 * @property {boolean} [hadProcessingError] - Whether an error occurred during image processing
 */
async function saveImageBufferAsFile(tempFilePath: string, imageBuffer: Buffer<ArrayBufferLike>) {
    await fs.promises.writeFile(tempFilePath, imageBuffer);

    // Try to normalize the image to a clean JPEG to avoid libvips SOS errors
    try {
        const processedImage = await sharp(imageBuffer, {failOnError: false, limitInputPixels: false})
            .rotate()
            .jpeg({quality: 90, progressive: true, mozjpeg: true})
            .toBuffer();

        await fs.promises.writeFile(tempFilePath, processedImage);
    } catch (sharpError) {
        try {
            const processedFallback = await sharp(imageBuffer, {failOnError: false})
                .png()
                .jpeg({quality: 90, progressive: true})
                .toBuffer();
            await fs.promises.writeFile(tempFilePath, processedFallback);
        } catch (fallbackError) {
            log(`Had an error processing image with Sharp.`);
            console.error(fallbackError);
            return false;
        }
    }

    return true;
}

/**
 * Review user photos
 * @param imageFiles
 * @param userId
 * @param evaluateImagesInPlace
 */
export async function reviewPhotos(imageFiles: { imageFile: File, s3Path: string }[],
                                   userId: number, evaluateImagesInPlace = false) {
    let photosBeingReviewedWithPath: PhotoWithTempPath[] = [];
    let promises = [];

    const dbResult = await prismaRead.users.findUnique({
        select: { photos: true },
        where: { id: userId }
    });

    for (const { imageFile, s3Path } of imageFiles) {
        promises.push(new Promise<PhotoWithTempPath>(async (resolve, reject) => {
            try {
                // Save images to temp files
                const fileExt = imageFile.name.split('.').pop();
                const tempFilePath = `/tmp/temp-img-${uuidv4()}.${fileExt}`;

                const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

                const success = await saveImageBufferAsFile(tempFilePath, imageBuffer);
                return resolve({ tempFilePath, s3Path, imageFile, hadProcessingError: !success });
            } catch (e) {
                return reject({ error: `Failed to download or write temp file for: ${imageFile.name}`, success: false });
            }
        }));
    }

    try {
        photosBeingReviewedWithPath = await Promise.all(promises);
    } catch (e: any) {
        return e as {error: string, success: false};
    }

    // Pull other stored photos (filtering out the photos we are reviewing) from S3 and save
    const storedPhotosDictionary: Record<string, UserPhoto> = (dbResult?.photos as unknown as UserPhoto[] || []).reduce((agg, curr) => {
        return {...agg, ...{ [curr.path]: curr }};
    }, {});

    const otherStoredPhotos = Object.values(storedPhotosDictionary).filter(p =>
        imageFiles.every(i => i.s3Path !== p.path));

    const s3Helper = new S3Helper();
    promises = [];
    for (const otherStoredPhoto of otherStoredPhotos) {
        promises.push(new Promise<PhotoWithTempPath>(async (resolve) => {
            const imageBuffer = await s3Helper.downloadImage(otherStoredPhoto.path);

            if (imageBuffer) {
                const fileExt = otherStoredPhoto.path.split('.').pop();
                const tempFilePath = `/tmp/temp-img-${uuidv4()}.${fileExt}`;

                const success = await saveImageBufferAsFile(tempFilePath, imageBuffer);
                return resolve({
                    tempFilePath,
                    s3Path: otherStoredPhoto.path,
                    imageFile: new File([imageBuffer], otherStoredPhoto.path, { type: `image/${fileExt}` }),
                    hadProcessingError: !success
                });
            }
        }));
    }

    const otherStoredPhotosWithPath = await Promise.all(promises);

    // Send each image to the external review service
    promises = [];
    for (const photoBeingReviewed of photosBeingReviewedWithPath) {
        promises.push(new Promise<PhotoWithTempPath>(async (resolve) => {
            if (photoBeingReviewed.hadProcessingError) {
                return resolve(photoBeingReviewed);
            }

            if ([...photosBeingReviewedWithPath, ...otherStoredPhotosWithPath].length > 0) {
                const isDupedImageResult = await isImageDuplicated(photoBeingReviewed.tempFilePath,
                    [...photosBeingReviewedWithPath, ...otherStoredPhotosWithPath]
                        .filter(p => !p.hadProcessingError)
                        .map(p => p.tempFilePath));

                if (isDupedImageResult.error) {
                    log(`An error occurred while checking for duplicate image - User ${userId} | ${photoBeingReviewed.tempFilePath}`);
                } else if (isDupedImageResult.isDuplicate) {
                    photoBeingReviewed.isRejected = true;
                    photoBeingReviewed.messages = ['Photo appears to be a duplicate of another photo of yours'];

                    return resolve(photoBeingReviewed);
                }
            }

            // Make a call to SightEngine for further image analysis
            const data = new FormData();
            data.append('media', fs.createReadStream(photoBeingReviewed.tempFilePath));
            data.append('models', SIGHTENGINE_MODELS.join(','));
            data.append('api_user', process.env.SIGHTENGINE_API_USER as string);
            data.append('api_secret', process.env.SIGHTENGINE_API_SECRET as string);

            const response = await axiosInstance
                .post('https://api.sightengine.com/1.0/check.json', data, {
                    headers: data.getHeaders(),
                    validateStatus: () => true
                });

            if (response.status !== 200) {
                photoBeingReviewed.hadProcessingError = true;
            }

            photoBeingReviewed.isRejected = false;
            photoBeingReviewed.messages = [];

            if (!photoBeingReviewed.hadProcessingError) {
                const summary = summarizeImageAnalysis(response.data);

                // Image didn't pass review
                if (Array.isArray(summary.messages) && summary.messages.length > 0) {
                    photoBeingReviewed.isRejected = true;
                    photoBeingReviewed.messages = summary.messages;
                }
            }

            return resolve(photoBeingReviewed)
        }));
    }

    photosBeingReviewedWithPath = await Promise.all(promises);

    // Clean up temp photos
    for (const photoWithPath of [...otherStoredPhotosWithPath, ...photosBeingReviewedWithPath]) {
        fs.access(photoWithPath.tempFilePath, fs.constants.F_OK, (err) => {
            if (!err) {
                fs.unlink(photoWithPath.tempFilePath, (err) => {
                    if (err) console.error('Failed to delete temp file:', err);
                });
            }
        });
    }

    // Update stored photos
    const updatedPhotos = [
        ...otherStoredPhotos,
        ...photosBeingReviewedWithPath.map((p, idx) => {
            const storedPhoto = _.get(storedPhotosDictionary, p.s3Path, {
                path: p.s3Path,
                sortOrder: idx,
                uploadedAt: new Date()
            });

            return {
                ...storedPhoto,
                ...{
                    messages: p.messages || [],
                    isRejected: p.isRejected,
                }
            };
        })
    ];

    const mainPhoto = updatedPhotos.find(p => !p.isRejected);

    await prismaWrite.users.update({
        where: { id: userId },
        data: {
            mainPhoto: mainPhoto?.path || null,
            photos: updatedPhotos as any,
            numOfPhotos: updatedPhotos.filter(p => !p.isRejected).length,
            updatedAt: new Date()
        }
    }).catch(error => {
        console.error(`An error occurred while saving photo review result for user: ${userId}`, error);
    });

    return { error: null, success: true, photos: photosBeingReviewedWithPath };
}

/**
 * Summarize image analysis from SiteEngine.
 * @param data
 */
function summarizeImageAnalysis(data: any) {
    const analysisReport: any = {};

    // Process nudity analysis
    if (data.nudity) {
        const nudity = data.nudity;
        const isNude = nudity.sexual_activity > 0.85 || nudity.sexual_display > 0.85 || nudity.erotica > 0.85;
        const isPartialNude = nudity.very_suggestive > 0.85 || nudity.suggestive > 0.85;
        const isSafe = nudity.none > 0.85;

        analysisReport.nudity = {
            raw: nudity,
            isNude,
            isPartialNude,
            isSafe
        };

        if (analysisReport.nudity.isNude) {
            analysisReport.messages = [...(analysisReport.messages || []),
            analysisReport.nudity.isPartialNude ? 'Photo contains partial nudity' : 'Photo contains full nudity'];
        }
    }

    // Process weapon detection
    if (data.weapon) {
        const weapon = data.weapon;
        const containsWeapon = weapon.classes.firearm > 0.85 ||
            weapon.classes.firearm_gesture > 0.85 ||
            weapon.classes.firearm_toy > 0.85 ||
            weapon.classes.knife > 0.85;

        analysisReport.weapon = {
            raw: weapon,
            containsWeapon
        };

        if (analysisReport.weapon.containsWeapon) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains weapon'];
        }
    }

    // Process recreational drug detection
    if (data.recreational_drug) {
        const recreationalDrug = data.recreational_drug;
        const containsRecreationalDrug = recreationalDrug.prob > 0.85 ||
            recreationalDrug.classes.cannabis > 0.85 ||
            recreationalDrug.classes.cannabis_logo_only > 0.85 ||
            recreationalDrug.classes.cannabis_plant > 0.85 ||
            recreationalDrug.classes.cannabis_drug > 0.85 ||
            recreationalDrug.classes.recreational_drugs_not_cannabis > 0.85;

        analysisReport.recreational_drug = {
            raw: recreationalDrug,
            containsRecreationalDrug
        };

        if (analysisReport.recreational_drug.containsRecreationalDrug) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains recreational drug'];
        }
    }

    // Process medical content detection
    if (data.medical) {
        const medical = data.medical;
        const containsMedicalContent = medical.prob > 0.85 ||
            medical.classes.pills > 0.85 ||
            medical.classes.paraphernalia > 0.85;

        analysisReport.medical = {
            raw: medical,
            containsMedicalContent
        };

        if (analysisReport.medical.containsMedicalContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains medical content'];
        }
    }

    // Process offensive content detection
    if (data.offensive) {
        const offensive = data.offensive;
        const isOffensive = offensive.nazi > 0.85 ||
            offensive.asian_swastika > 0.85 ||
            offensive.confederate > 0.85 ||
            offensive.supremacist > 0.85 ||
            offensive.terrorist > 0.85 ||
            offensive.middle_finger > 0.85;

        analysisReport.offensive = {
            raw: offensive,
            isOffensive
        };

        if (analysisReport.offensive.isOffensive) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains offensive content'];
        }
    }

    // Process gore detection
    if (data.gore) {
        const gore = data.gore;
        const containsGore = gore.prob > 0.85 ||
            gore.classes.very_bloody > 0.85 ||
            gore.classes.slightly_bloody > 0.85 ||
            gore.classes.body_organ > 0.85 ||
            gore.classes.serious_injury > 0.85 ||
            gore.classes.superficial_injury > 0.85 ||
            gore.classes.corpse > 0.85 ||
            gore.classes.skull > 0.85 ||
            gore.classes.unconscious > 0.85 ||
            gore.classes.body_waste > 0.85 ||
            gore.classes.other > 0.85;

        analysisReport.gore = {
            raw: gore,
            containsGore
        };

        if (analysisReport.gore.containsGore) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains gore'];
        }
    }

    // Process violence detection
    if (data.violence) {
        const violence = data.violence;
        const containsViolence = violence.prob > 0.85 ||
            violence.classes.physical_violence > 0.85 ||
            violence.classes.firearm_threat > 0.85 ||
            violence.classes.combat_sport > 0.85;

        analysisReport.violence = {
            raw: violence,
            containsViolence
        };

        if (analysisReport.violence.containsViolence) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains violence'];
        }
    }

    // Process self-harm detection
    if (data['self-harm']) {
        const selfHarm = data['self-harm'];
        const containsSelfHarmContent = selfHarm.prob > 0.85 ||
            selfHarm.type.real > 0.85 ||
            selfHarm.type.fake > 0.85 ||
            selfHarm.type.animated > 0.85;

        analysisReport.self_harm = {
            raw: selfHarm,
            containsSelfHarmContent
        };

        if (analysisReport.self_harm.containsSelfHarmContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains self-harm content'];
        }
    }

    // Process scam detection
    if (data.scam) {
        const scam = data.scam;
        const containsScamContent = scam.prob > 0.85;

        analysisReport.scam = {
            raw: scam,
            containsScamContent
        };

        if (analysisReport.scam.containsScamContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo has been identified as scam content'];
        }
    }

    // Process gambling detection
    if (data.gambling) {
        const gambling = data.gambling;
        const containsGamblingContent = gambling.prob > 0.85;

        analysisReport.gambling = {
            raw: gambling,
            containsGamblingContent
        };

        if (analysisReport.gambling.containsGamblingContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains gambling content'];
        }
    }

    // Process tobacco detection
    if (data.tobacco) {
        const tobacco = data.tobacco;
        const containsTobaccoContent = tobacco.prob > 0.85 ||
            tobacco.classes.regular_tobacco > 0.85 ||
            tobacco.classes.ambiguous_tobacco > 0.85;

        analysisReport.tobacco = {
            raw: tobacco,
            containsTobaccoContent
        };

        if (analysisReport.tobacco.containsTobaccoContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains tobacco content'];
        }
    }

    // Process generative AI detection
    if (data.type) {
        analysisReport.aiGenerated = {
            raw: data.type,
            isAIGenerated: data.type.ai_generated >= 0.85
        };

        if (analysisReport.aiGenerated.isAIGenerated) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo appears to be heavily edited or AI-generated'];
        }
    }

    // Process is illustration detection
    if (data.type) {
        analysisReport.isIllustration = {
            raw: data.type,
            isIllustration: data.type.illustration > 0.85
        };

        if (analysisReport.isIllustration.isIllustration) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo appears to be an illustration'];
        }
    }

    // Process qr-content detection
    if (data.qr) {
        analysisReport.qrContent = {
            raw: data.qr,
            hasLinks: Array.isArray(data.qr.link) && data.qr.link.length > 0,
            hasSocialLinks: Array.isArray(data.qr.social) && data.qr.social.length > 0,
            hasSpamContent: Array.isArray(data.qr.spam) && data.qr.spam.length > 0,
            hasProfanity: Array.isArray(data.qr.profanity) && data.qr.profanity.length > 0,
            isBlacklisted: Array.isArray(data.qr.blacklist) && data.qr.blacklist.length > 0,
            hasPersonalInfo: Array.isArray(data.qr.personal) && data.qr.personal.length > 0
        };

        if (analysisReport.qrContent.isBlacklisted) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains blacklisted QR code'];
        }
    }

    // Process text detection
    if (data.text) {
        analysisReport.text = {
            raw: data.text,
            hasProfanity: Array.isArray(data.text.profanity) && data.text.profanity.length > 0,
            hasPersonalInfo: Array.isArray(data.text.personal) && data.text.personal.length > 0,
            hasLinks: Array.isArray(data.text.link) && data.text.link.length > 0,
            hasSocialLinks: Array.isArray(data.text.social) && data.text.social.length > 0,
            hasExtremism: Array.isArray(data.text.extremism) && data.text.extremism.length > 0,
            hasMedicalContent: Array.isArray(data.text.medical) && data.text.medical.length > 0,
            hasDrugReferences: Array.isArray(data.text.drug) && data.text.drug.length > 0,
            hasWeaponReferences: Array.isArray(data.text.weapon) && data.text.weapon.length > 0,
            hasContentTrade: Array.isArray(data.text["content-trade"]) && data.text["content-trade"].length > 0,
            hasMoneyTransactions: Array.isArray(data.text["money-transaction"]) && data.text["money-transaction"].length > 0,
            hasSpam: Array.isArray(data.text.spam) && data.text.spam.length > 0,
            hasViolence: Array.isArray(data.text.violence) && data.text.violence.length > 0,
            hasSelfHarm: Array.isArray(data.text["self-harm"]) && data.text["self-harm"].length > 0,
            hasArtificialText: data.text.has_artificial > 0.85,
            hasNaturalText: data.text.has_natural > 0.85
        };

        if (analysisReport.text.hasProfanity) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains inappropriate text'];
        }
    }

    // Process faces detection
    if (data.faces) {
        analysisReport.faces = {
            raw: data.faces,
            count: Array.isArray(data.faces) ? data.faces.length : 0,
            hasFaces: Array.isArray(data.faces) && data.faces.length > 0,
            hasMinors: Array.isArray(data.faces) && data.faces.some((face: any) =>
                face.attributes && face.attributes.minor >= 0.98),
            hasSunglasses: Array.isArray(data.faces) && data.faces.some((face: any) =>
                face.attributes && face.attributes.sunglasses > 0.85)
        };

        if (analysisReport.faces.hasMinors) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains faces of minors'];
        }

        if (!analysisReport.faces.hasFaces) {
            analysisReport.messages = [...(analysisReport.messages || []), 'You must have a clear face in your photo'];
        }
    }

    return analysisReport as ImageAnalysisSummary;
}

/**
 * Check if image is duplicated.
 * @param tempFilePath
 * @param allTempImagePaths
 */
async function isImageDuplicated(tempFilePath: string, allTempImagePaths: string[]) {

    try {
        for (const otherTempFilePath of allTempImagePaths) {
            if (otherTempFilePath === tempFilePath) continue;

            // Convert images to ImageData objects
            const img1 = await loadImageData(tempFilePath);
            const img2 = await loadImageData(otherTempFilePath);

            const result = ssim(img1, img2);
            if (result.mssim >= 0.5) {
                return { error: null, success: true, isDuplicate: true };
            }
        }

        return { error: null, success: true, isDuplicate: false };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to compare images for duplication', success: false, isDuplicate: false };
    }
}

/**
 * Load image data from file path and convert to ImageData format
 * Resizes images to a standard size for comparison
 * @param filePath
 */
async function loadImageData(filePath: string): Promise<ImageData> {
    const STANDARD_SIZE = 256;
    const image = sharp(filePath, { failOnError: false, limitInputPixels: false });
    const { data, info } = await image
        .resize(STANDARD_SIZE, STANDARD_SIZE, { fit: 'fill' })
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

    return {
        data: new Uint8ClampedArray(data),
        width: info.width,
        height: info.height
    } as ImageData;
}
