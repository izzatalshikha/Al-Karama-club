const fs = require('fs');
const fields = [
  { key: 'fatherName', label: 'اسم الأب' },
  { key: 'motherName', label: 'اسم الأم' },
  { key: 'birthDate', label: 'تاريخ الميلاد' },
  { key: 'birthPlace', label: 'مكان الولادة' },
  { key: 'khana', label: 'الخانة' },
  { key: 'nationalId', label: 'الرقم الوطني' },
  { key: 'federalNumber', label: 'الرقم الاتحادي' },
  { key: 'internationalId', label: 'الرقم الدولي' },
  { key: 'address', label: 'عنوان السكن' },
  { key: 'role', label: 'الدور الوظيفي' },
  { key: 'number', label: 'رقم القميص' },
  { key: 'phone', label: 'رقم الهاتف' },
  { key: 'joinDate', label: 'تاريخ الانضمام' },
  { key: 'contractStart', label: 'بداية العقد' },
  { key: 'contractEnd', label: 'نهاية العقد' },
  { key: 'contractValue', label: 'قيمة العقد' },
  { key: 'subscriptionAmount', label: 'مبلغ الاشتراك' },
  { key: 'subscriptionMonth', label: 'شهر الاشتراك' },
  { key: 'registrationDate', label: 'تاريخ التسجيل' },
  { key: 'receivedKit', label: 'استلم لباس', format: 'boolean' },
  { key: 'kitAmount', label: 'مبلغ اللباس' },
  { key: 'isAcademyPlayer', label: 'تصنيف اللاعب', format: 'academy' },
  { key: 'medicalHistory', label: 'السجل الطبي' },
  { key: 'injuries', label: 'الإصابات السابقة' },
  { key: 'penalties', label: 'العقوبات' },
  { key: 'notes', label: 'ملاحظات' },
  { key: 'coachingCertificate', label: 'الشهادة التدريبية' },
  { key: 'academicDegree', label: 'التحصيل العلمي' },
];

let out = '';
fields.forEach(f => {
    let p1 = `{player1.${f.key} || '-'}`;
    let p2 = `{player2.${f.key} || '-'}`;
    
    if (f.format === 'boolean') {
        p1 = `{player1.${f.key} ? 'نعم' : 'لا'}`;
        p2 = `{player2.${f.key} ? 'نعم' : 'لا'}`;
    } else if (f.format === 'academy') {
        p1 = `{player1.${f.key} ? 'لاعب أكاديمية' : 'لاعب نادي'}`;
        p2 = `{player2.${f.key} ? 'لاعب أكاديمية' : 'لاعب نادي'}`;
    }

    out += `                      <tr className="border-b border-slate-100 hover:bg-slate-50">\n`;
    out += `                        <td className="p-3 border-l border-slate-100 font-semibold">${p1}</td>\n`;
    out += `                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">${f.label}</td>\n`;
    out += `                        <td className="p-3 font-semibold">${p2}</td>\n`;
    out += `                      </tr>\n`;
});

console.log(out);
