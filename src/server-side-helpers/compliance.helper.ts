import { UserPhoto } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import FormData from 'form-data';
import { S3Helper } from "@/server-side-helpers/s3.helper";
import axios from "axios";
import http from "http";
import ssim from 'ssim.js';
import sharp from 'sharp';
import { ImageAnalysisSummary } from "@/types/image-analysis.types";
import { prismaRead, prismaWrite } from "@/lib/prisma";

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

/**
 * Review user photos
 * @param imageFiles
 * @param userId
 * @param onImageReviewed
 */
export async function reviewPhotos(imageFiles: { imageFile: File, s3Path: string }[], userId: number, onImageReviewed?: (imageFile: File) => null) {
    const allPhotosWithFilePath: { tempFilePath: string, s3Path: string, imageFile: File, isRejected?: boolean, messages?: string[] }[] = [];

    const dbResult = await prismaRead.users.findUnique({
        select: { photos: true },
        where: { id: userId }
    })

    let storedPhotos = dbResult?.photos as unknown as UserPhoto[] || [];

    for (const { imageFile, s3Path } of imageFiles) {
        try {
            // Save images to temp files
            const fileExt = imageFile.name.split('.').pop();
            const tempFilePath = `/tmp/temp-img-${uuidv4()}.${fileExt}`;

            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

            await fs.promises.writeFile(tempFilePath, imageBuffer);
            allPhotosWithFilePath.push({ tempFilePath, s3Path, imageFile });

        } catch (e) {
            return { error: `Failed to download or write temp file for: ${imageFile.name}`, success: false };
        }
    }

    const tempFilePaths = allPhotosWithFilePath.map(p => p.tempFilePath);

    // Send each image to the external review service
    for (const photoWithFilePath of allPhotosWithFilePath) {
        const isDupedImageResult = await isImageDuplicated(photoWithFilePath.tempFilePath, tempFilePaths);

        if (isDupedImageResult.error) {
            return { error: isDupedImageResult.error, success: false };
        }

        if (isDupedImageResult.isDuplicate) {
            photoWithFilePath.isRejected = true;
            photoWithFilePath.messages = ['Photo appears to be a duplicate of another photo'];

            fs.unlink(photoWithFilePath.tempFilePath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });

            continue;
        }

        // Make a call to SightEngine for further image analysis
        const data = new FormData();
        data.append('media', fs.createReadStream(photoWithFilePath.tempFilePath));
        data.append('models', SIGHTENGINE_MODELS.join(','));
        data.append('api_user', process.env.SIGHTENGINE_API_USER as string);
        data.append('api_secret', process.env.SIGHTENGINE_API_SECRET as string);

        const response = await axiosInstance
            .post('https://api.sightengine.com/1.0/check.json', data, {
                headers: data.getHeaders(),
                validateStatus: (status) => true
            });

        if (response.status !== 200) {
            return {
                error: `External review service returned status ${response.status}`,
                success: false
            };
        }

        const summary = summarizeImageAnalysis(response.data);
        if (!summary.success || !summary.analysis) {
            console.error(summary.error);
            return {
                error: `Failed to summarize image analysis for ${photoWithFilePath.imageFile.name}`,
                success: false
            };
        }

        // Image should be approved if no issues found
        if (!summary.analysis.messages || summary.analysis.messages.length === 0) {
            photoWithFilePath.isRejected = false;
            continue;
        }

        // Add issues for review
        photoWithFilePath.isRejected = true;
        photoWithFilePath.messages = summary.analysis.messages;

        if (onImageReviewed) {
            onImageReviewed(photoWithFilePath.imageFile);
        }
    }

    for (const photoWithFilePath of allPhotosWithFilePath) {

        // Update stored photos
        storedPhotos = storedPhotos.map(s => {
            if (s.path === photoWithFilePath.s3Path) {
                return {
                    ...s, ...{
                        isRejected: photoWithFilePath.isRejected,
                        messages: photoWithFilePath.messages || [],
                        isUnderReview: photoWithFilePath.isRejected
                    }
                }
            }

            return s;
        });

        fs.unlink(photoWithFilePath.tempFilePath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });
    }

    await prismaWrite.users.update({
        where: { id: userId },
        data: {
            photos: storedPhotos as any,
            numOfPhotos: storedPhotos.filter(p => !p.isUnderReview && !p.isRejected).length,
            updatedAt: new Date()
        }
    });

    return { error: null, success: true, photos: allPhotosWithFilePath };
}

/**
 * Summarize image analysis from SiteEngine.
 * @param data
 */
function summarizeImageAnalysis(data: any) {
    const analysisReport: any = {};

    if (data.status !== 'success') {
        return { error: 'Image analysis failed', success: false };
    }

    // Process nudity analysis
    if (data.nudity) {
        analysisReport.nudity = {
            raw: data.nudity,
            isNude: data.nudity.raw > 0.85 || data.nudity.partial > 0.85,
            isPartialNude: data.nudity.partial > 0.85 && data.nudity.raw <= 0.85,
            isSafe: data.nudity.safe > 0.85
        };

        if (analysisReport.nudity.isNude) {
            analysisReport.messages = [...(analysisReport.messages || []),
            analysisReport.nudity.isPartialNude ? 'Photo contains partial nudity' : 'Photo contains full nudity'];
        }
    }

    // Process weapon detection
    if (data.weapon) {
        analysisReport.weapon = {
            raw: data.weapon,
            containsWeapon: data.weapon > 0.85
        };

        if (analysisReport.weapon.containsWeapon) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains weapon'];
        }
    }

    // Process recreational drug detection
    if (data.recreational_drug) {
        analysisReport.recreational_drug = {
            raw: data.recreational_drug,
            containsRecreationalDrug: data.recreational_drug > 0.85
        };

        if (analysisReport.recreational_drug.containsRecreationalDrug) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains recreational drug'];
        }
    }

    // Process medical content detection
    if (data.medical) {
        analysisReport.medical = {
            raw: data.medical,
            containsMedicalContent: data.medical > 0.85
        };

        if (analysisReport.medical.containsMedicalContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains medical content'];
        }
    }

    // Process offensive content detection
    if (data.offensive) {
        analysisReport.offensive = {
            raw: data.offensive,
            isOffensive: data.offensive > 0.85
        };

        if (analysisReport.offensive.isOffensive) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains offensive content'];
        }
    }

    // Process gore detection
    if (data.gore) {
        analysisReport.gore = {
            raw: data.gore,
            containsGore: data.gore > 0.85
        };

        if (analysisReport.gore.containsGore) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains gore'];
        }
    }

    // Process violence detection
    if (data.violence) {
        analysisReport.violence = {
            raw: data.violence,
            containsViolence: data.violence > 0.85
        };

        if (analysisReport.violence.containsViolence) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains violence'];
        }
    }

    // Process self-harm detection
    if (data['self-harm']) {
        analysisReport.self_harm = {
            raw: data['self-harm'],
            containsSelfHarmContent: data['self-harm'] > 0.85
        };

        if (analysisReport.self_harm.containsSelfHarmContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains self-harm content'];
        }
    }

    // Process scam detection
    if (data.scam) {
        analysisReport.scam = {
            raw: data.scam,
            containsScamContent: data.scam > 0.85
        };

        if (analysisReport.scam.containsScamContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo has been identified as scam content'];
        }
    }

    // Process gambling detection
    if (data.gambling) {
        analysisReport.gambling = {
            raw: data.gambling,
            containsGamblingContent: data.gambling > 0.85
        };

        if (analysisReport.gambling.containsGamblingContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains gambling content'];
        }
    }

    // Process tobacco detection
    if (data.tobacco) {
        analysisReport.tobacco = {
            raw: data.tobacco,
            containsTobaccoContent: data.tobacco > 0.85
        };

        if (analysisReport.tobacco.containsTobaccoContent) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains tobacco content'];
        }
    }

    // Process generative AI detection
    if (data.type) {
        analysisReport.aiGenerated = {
            raw: data.type,
            isAIGenerated: data.type.ai_generated >= 0.98
        };

        if (analysisReport.aiGenerated.isAIGenerated) {
            analysisReport.messages = [...(analysisReport.messages || []), 'Photo appears to be AI-generated'];
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

    return {
        error: null, success: true,
        analysis: analysisReport as ImageAnalysisSummary
    };
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
            if (result.mssim >= 0.95) {
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

    const image = sharp(filePath);
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
