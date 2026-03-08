/**
 * itemImages.ts
 * Static image URLs for all item artwork.
 * Uses Unsplash images — compatible with all hosting environments (Vercel, etc.)
 */

import {
  woodenSwordImg,
  woodenDaggerImg,
  woodenBowImg,
  woodenStaffImg,
  woodenShieldImg,
  leatherArmorImg,
  leatherPantsImg,
  leatherBootsImg,
  leatherHelmImg,
} from './imageAssets';

/**
 * Map from item defId → image URL.
 * Items not listed here fall back to their SVG art or emoji icon display in ItemArt.
 */
export const ITEM_IMAGES: Record<string, string> = {
  wooden_sword  : woodenSwordImg,
  wooden_dagger : woodenDaggerImg,
  wooden_bow    : woodenBowImg,
  wooden_staff  : woodenStaffImg,
  wooden_shield : woodenShieldImg,
  leather_armor : leatherArmorImg,
  leather_pants : leatherPantsImg,
  leather_boots : leatherBootsImg,
  leather_helm  : leatherHelmImg,
};
