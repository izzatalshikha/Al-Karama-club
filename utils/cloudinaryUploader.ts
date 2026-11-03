/**
 * خدمة الرفع السحابي فائق السرعة والمجاني عبر Cloudinary
 * تقوم برفع الصور وتطبيق ضغط ذكي تلقائي (f_auto, q_auto) لإنتاج صور خفيفة جداً (15-30KB)
 * دون استهلاك أي مساحة أو Disk IO من قاعدة بيانات Supabase
 */

export const CLOUDINARY_CLOUD_NAME = 'vpxrppfh';
export const CLOUDINARY_UPLOAD_PRESET = 'eagle_preset';

/**
 * تحويل رابط Cloudinary إلى صيغة فائقة السرعة مع الضغط التلقائي والتحجيم المناسب
 */
export function getOptimizedCloudinaryUrl(url: string, maxWidth: number = 800): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('cloudinary.com') || url.includes('f_auto,q_auto')) return url;

  // إدراج تحويلات f_auto (اختيار أفضل صيغة WebP/AVIF تلقائياً) و q_auto (جودة ذكية بأصغر حجم)
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const prefix = url.substring(0, uploadIndex + 8);
  const suffix = url.substring(uploadIndex + 8);
  const transformations = `f_auto,q_auto,w_${maxWidth},c_limit`;

  return `${prefix}${transformations}/${suffix}`;
}

/**
 * رفع ملف صورة أو Blob أو Base64 إلى Cloudinary مباشرة من المتصفح
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string,
  folder: 'avatars' | 'documents' | 'certificates' = 'avatars'
): Promise<string> {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();

  formData.append('file', fileOrBase64);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `eagle_club/${folder}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `فشل الرفع إلى Cloudinary (كود ${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const secureUrl = data.secure_url || data.url;

  // تحسين الرابط تلقائياً ليكون أصغر حجماً وأسرع تحميلاً
  const optimized = getOptimizedCloudinaryUrl(secureUrl, folder === 'avatars' ? 500 : 1200);
  return optimized;
}
