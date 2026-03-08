/**
 * itemImages.ts
 * Static imports for all item artwork (figma:asset scheme).
 *
 * IMPORTANT: Only add imports for hashes that are confirmed valid
 * (uploaded via Figma Make). Using an invented/wrong hash will cause
 * a build error and break any component that imports this module.
 */

import woodenSwordImg  from 'figma:asset/33f8542237ebd165d82407ebba5fba13efe9ace6.png';
import woodenDaggerImg from 'figma:asset/02679c625f92f8d51829a5cd5cd9ea58e015a7b3.png';
import woodenBowImg    from 'figma:asset/6d0190772e174cc6681726ec7d5970c3ea1fc2c7.png';
import woodenStaffImg  from 'figma:asset/46421e85081f63043faed33dc80e0b8257d9d658.png';
import woodenShieldImg from 'figma:asset/9041b2fafd4690a5a25156fe365eb52e54d75700.png';
import leatherArmorImg from 'figma:asset/e4b701164a5699c3e67b66ab524713018290122f.png';
import leatherPantsImg from 'figma:asset/dbeb3bc81e2e5bc42ad612200393bebe28bfbf01.png';
import leatherBootsImg from 'figma:asset/ac9f6cb3f229f69a68c6372dbc7c501f2166396a.png';
import leatherHelmImg  from 'figma:asset/d71c2d96757c5e22ffc2b755cb0287bd8bf794e9.png';

/**
 * Map from item defId → confirmed image URL.
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