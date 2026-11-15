/**
 * خدمة الرفع السحابي فائق السرعة والمجاني عبر Cloudinary
 * تتضمن فحص أمني صارم للملفات (Whitelisting) للحماية من رفع البرمجيات الخبيثة
 * وتقوم بتطبيق ضغط ذكي تلقائي (f_auto, q_auto) دون استهلاك أي مساحة أو Disk IO من قاعدة بيانات Supabase
 */

export const CLOUDINARY_CLOUD_NAME = 'vpxrppfh';
export const CLOUDINARY_UPLOAD_PRESET = 'eagle_preset';

// الحد الأقصى لحجم الملف المسموح به: 15 ميغابايت
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// القائمة البيضاء للصيغ المسموح برفعها حصراً (صور ومستندات تقارير طبية PDF)
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'application/pdf',
]);

// الامتدادات المسموح بها
export const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'pdf'
]);

// الامتدادات المحظورة والخطيرة
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'js', 'mjs', 'cjs', 'vbs', 'py', 
  'html', 'htm', 'scr', 'dll', 'jar', 'msi', 'ps1', 'apk', 'com', 'phtml'
]);

/**
 * التحقق الأمني الصارم من سلامة الملف قبل إرساله للرفع
 */
export function validateFileSecurity(fileOrBase64: File | Blob | string): void {
  if (!fileOrBase64) {
    throw new Error('لم يتم تحديد أي ملف للرفع.');
  }

  // 1. إذا كان كائناً من نوع File
  if (typeof File !== 'undefined' && fileOrBase64 instanceof File) {
    if (fileOrBase64.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (fileOrBase64.size / (1024 * 1024)).toFixed(1);
      throw new Error(`حجم الملف كبير جداً (${sizeMB} ميغابايت). الحد الأقصى المسموح به هو 15 ميغابايت.`);
    }

    const fileName = fileOrBase64.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new Error(`نوع الملف (.${ext}) محظور لأسباب أمنية.`);
    }

    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`صيغة الملف غير مدعومة (.${ext}). يرجى رفع ملفات صور (JPG, PNG, WEBP) أو تقارير PDF فقط.`);
    }

    if (fileOrBase64.type && !ALLOWED_MIME_TYPES.has(fileOrBase64.type.toLowerCase())) {
      throw new Error(`نوع الوسائط (${fileOrBase64.type}) غير مسموح برفعها.`);
    }
    return;
  }

  // 2. إذا كان كائناً من نوع Blob
  if (typeof Blob !== 'undefined' && fileOrBase64 instanceof Blob) {
    if (fileOrBase64.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميغابايت).');
    }
    if (fileOrBase64.type && !ALLOWED_MIME_TYPES.has(fileOrBase64.type.toLowerCase())) {
      throw new Error(`نوع الوسائط (${fileOrBase64.type}) غير مسموح به.`);
    }
    return;
  }

  // 3. إذا كان نص Base64
  if (typeof fileOrBase64 === 'string') {
    // تقدير الحجم من طول الـ Base64
    const approxSize = (fileOrBase64.length * 3) / 4;
    if (approxSize > MAX_FILE_SIZE_BYTES) {
      throw new Error('حجم البيانات يتجاوز الحد الأقصى المسموح به (15 ميغابايت).');
    }

    if (fileOrBase64.startsWith('data:')) {
      const mimeMatch = fileOrBase64.match(/^data:([^;]+);/);
      if (mimeMatch && mimeMatch[1]) {
        const mime = mimeMatch[1].toLowerCase();
        if (!ALLOWED_MIME_TYPES.has(mime)) {
          throw new Error(`نوع الملف المضمن (${mime}) غير مسموح به.`);
        }
      }
    }
  }
}

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
 * رفع ملف صورة أو Blob أو Base64 إلى Cloudinary مباشرة بعد التحقق الأمني
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string,
  folder: 'avatars' | 'documents' | 'certificates' = 'avatars'
): Promise<string> {
  // فحص أمني مسبق للملف
  validateFileSecurity(fileOrBase64);

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
