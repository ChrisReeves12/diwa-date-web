export interface CleavageCategories {
  very_revealing: number;
  revealing: number;
  none: number;
}

export interface MaleChestCategories {
  very_revealing: number;
  revealing: number;
  slightly_revealing: number;
  none: number;
}

export interface SuggestiveClasses {
  bikini: number;
  cleavage: number;
  cleavage_categories: CleavageCategories;
  lingerie: number;
  male_chest: number;
  male_chest_categories: MaleChestCategories;
  male_underwear: number;
  miniskirt: number;
  minishort: number;
  nudity_art: number;
  schematic: number;
  sextoy: number;
  suggestive_focus: number;
  suggestive_pose: number;
  swimwear_male: number;
  swimwear_one_piece: number;
  visibly_undressed: number;
  other: number;
}

export interface NudityContext {
  sea_lake_pool: number;
  outdoor_other: number;
  indoor_other: number;
}

export interface NudityRaw {
  sexual_activity: number;
  sexual_display: number;
  erotica: number;
  very_suggestive: number;
  suggestive: number;
  mildly_suggestive: number;
  suggestive_classes: SuggestiveClasses;
  none: number;
  context: NudityContext;
}

export interface Nudity {
  raw: NudityRaw;
  isNude: boolean;
  isPartialNude: boolean;
  isSafe: boolean;
}

export interface WeaponClasses {
  firearm: number;
  firearm_gesture: number;
  firearm_toy: number;
  knife: number;
}

export interface FirearmType {
  animated: number;
}

export interface FirearmAction {
  aiming_threat: number;
  aiming_camera: number;
  aiming_safe: number;
  in_hand_not_aiming: number;
  worn_not_in_hand: number;
  not_worn: number;
}

export interface WeaponRaw {
  classes: WeaponClasses;
  firearm_type: FirearmType;
  firearm_action: FirearmAction;
}

export interface Weapon {
  raw: WeaponRaw;
  containsWeapon: boolean;
}

export interface RecreationalDrugClasses {
  cannabis: number;
  cannabis_logo_only: number;
  cannabis_plant: number;
  cannabis_drug: number;
  recreational_drugs_not_cannabis: number;
}

export interface RecreationalDrugRaw {
  prob: number;
  classes: RecreationalDrugClasses;
}

export interface RecreationalDrug {
  raw: RecreationalDrugRaw;
  containsRecreationalDrug: boolean;
}

export interface MedicalClasses {
  pills: number;
  paraphernalia: number;
}

export interface MedicalRaw {
  prob: number;
  classes: MedicalClasses;
}

export interface Medical {
  raw: MedicalRaw;
  containsMedicalContent: boolean;
}

export interface OffensiveRaw {
  nazi: number;
  asian_swastika: number;
  confederate: number;
  supremacist: number;
  terrorist: number;
  middle_finger: number;
}

export interface Offensive {
  raw: OffensiveRaw;
  isOffensive: boolean;
}

export interface GoreClasses {
  very_bloody: number;
  slightly_bloody: number;
  body_organ: number;
  serious_injury: number;
  superficial_injury: number;
  corpse: number;
  skull: number;
  unconscious: number;
  body_waste: number;
  other: number;
}

export interface GoreType {
  animated: number;
  fake: number;
  real: number;
}

export interface GoreRaw {
  prob: number;
  classes: GoreClasses;
  type: GoreType;
}

export interface Gore {
  raw: GoreRaw;
  containsGore: boolean;
}

export interface ViolenceClasses {
  physical_violence: number;
  firearm_threat: number;
  combat_sport: number;
}

export interface ViolenceRaw {
  prob: number;
  classes: ViolenceClasses;
}

export interface Violence {
  raw: ViolenceRaw;
  containsViolence: boolean;
}

export interface SelfHarmType {
  real: number;
  fake: number;
  animated: number;
}

export interface SelfHarmRaw {
  prob: number;
  type: SelfHarmType;
}

export interface SelfHarm {
  raw: SelfHarmRaw;
  containsSelfHarmContent: boolean;
}

export interface GamblingRaw {
  prob: number;
}

export interface Gambling {
  raw: GamblingRaw;
  containsGamblingContent: boolean;
}

export interface TobaccoClasses {
  regular_tobacco: number;
  ambiguous_tobacco: number;
}

export interface TobaccoRaw {
  prob: number;
  classes: TobaccoClasses;
}

export interface Tobacco {
  raw: TobaccoRaw;
  containsTobaccoContent: boolean;
}

export interface AIGeneratedRaw {
  photo: number;
  illustration: number;
  ai_generated: number;
}

export interface AIGenerated {
  raw: AIGeneratedRaw;
  isAIGenerated: boolean;
}

export interface IllustrationRaw {
  photo: number;
  illustration: number;
  ai_generated: number;
}

export interface IsIllustration {
  raw: IllustrationRaw;
  isIllustration: boolean;
}

export interface QRContentRaw {
  personal: string[];
  link: string[];
  social: string[];
  spam: string[];
  profanity: string[];
  blacklist: string[];
}

export interface QRContent {
  raw: QRContentRaw;
  hasLinks: boolean;
  hasSocialLinks: boolean;
  hasSpamContent: boolean;
  hasProfanity: boolean;
  isBlacklisted: boolean;
  hasPersonalInfo: boolean;
}

export interface TextRaw {
  profanity: string[];
  personal: string[];
  link: string[];
  social: string[];
  extremism: string[];
  medical: string[];
  drug: string[];
  weapon: string[];
  "content-trade": string[];
  "money-transaction": string[];
  spam: string[];
  violence: string[];
  "self-harm": string[];
  has_artificial: number;
  has_natural: number;
}

export interface Text {
  raw: TextRaw;
  hasProfanity: boolean;
  hasPersonalInfo: boolean;
  hasLinks: boolean;
  hasSocialLinks: boolean;
  hasExtremism: boolean;
  hasMedicalContent: boolean;
  hasDrugReferences: boolean;
  hasWeaponReferences: boolean;
  hasContentTrade: boolean;
  hasMoneyTransactions: boolean;
  hasSpam: boolean;
  hasViolence: boolean;
  hasSelfHarm: boolean;
  hasArtificialText: boolean;
  hasNaturalText: boolean;
}

export interface FaceFeaturePoint {
  x: number;
  y: number;
}

export interface FaceFeatures {
  left_eye: FaceFeaturePoint;
  right_eye: FaceFeaturePoint;
  nose_tip: FaceFeaturePoint;
  left_mouth_corner: FaceFeaturePoint;
  right_mouth_corner: FaceFeaturePoint;
}

export interface FaceAttributes {
  minor: number;
  sunglasses: number;
}

export interface FaceDetection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  features: FaceFeatures;
  attributes: FaceAttributes;
}

export interface Faces {
  raw: FaceDetection[];
  count: number;
  hasFaces: boolean;
  hasMinors: boolean;
  hasSunglasses: boolean;
}

export interface ImageAnalysisSummary {
  nudity: Nudity;
  weapon: Weapon;
  recreational_drug: RecreationalDrug;
  medical: Medical;
  offensive: Offensive;
  gore: Gore;
  violence: Violence;
  self_harm: SelfHarm;
  gambling: Gambling;
  tobacco: Tobacco;
  aiGenerated: AIGenerated;
  isIllustration: IsIllustration;
  qrContent: QRContent;
  text: Text;
  faces: Faces;
  messages: string[];
}
