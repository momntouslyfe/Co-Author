import { Font } from '@react-pdf/renderer';

export const LATIN_FONTS = [
  { name: 'Roboto', label: 'Roboto' },
  { name: 'Open Sans', label: 'Open Sans' },
  { name: 'Lato', label: 'Lato' },
  { name: 'Merriweather', label: 'Merriweather' },
  { name: 'Playfair Display', label: 'Playfair Display' },
  { name: 'Noto Sans', label: 'Noto Sans' },
  { name: 'Noto Serif', label: 'Noto Serif' },
  { name: 'Poppins', label: 'Poppins' },
] as const;

export const MULTILANG_FONTS = [
  { name: 'Noto Sans Arabic', label: 'Noto Sans Arabic (العربية)' },
  { name: 'Noto Sans Bengali', label: 'Noto Sans Bengali (বাংলা)' },
  { name: 'Noto Sans Devanagari', label: 'Noto Sans Devanagari (हिंदी)' },
  { name: 'Noto Sans JP', label: 'Noto Sans JP (日本語)' },
  { name: 'Noto Sans KR', label: 'Noto Sans KR (한국어)' },
  { name: 'Noto Sans SC', label: 'Noto Sans SC (简体中文)' },
  { name: 'Noto Sans Thai', label: 'Noto Sans Thai (ไทย)' },
] as const;

export const AVAILABLE_FONTS = [
  ...LATIN_FONTS,
  ...MULTILANG_FONTS,
] as const;

export type FontName = typeof AVAILABLE_FONTS[number]['name'];

let fontsRegistered = false;

export async function registerFonts(): Promise<void> {
  if (fontsRegistered) {
    return;
  }
  
  fontsRegistered = true;

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOkCnqEu92Fr1Mu51xIIzI.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOjCnqEu92Fr1Mu51TzBic6CsQ.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Open Sans',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4gaVI.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/opensans/v40/memQYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWq8tWZ0Pw86hd0Rk8ZkaVI.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/opensans/v40/memQYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWq8tWZ0Pw86hd0Rk5RlaVI.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Lato',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXg.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/lato/v24/S6u8w4BMUTPHjxsAXC-q.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/lato/v24/S6u_w4BMUTPHjxsI5wq_Gwft.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Merriweather',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5-fCZM.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyriQwlOrhSvowK_l52xwNZWMf6.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/merriweather/v30/u-4m0qyriQwlOrhSvowK_l5-eSZJdeP3.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/merriweather/v30/u-4l0qyriQwlOrhSvowK_l5-eR7lXcf_hP3hPGWH.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Playfair Display',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qC0s.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDYYNXK-F2qC0s.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTXtXA-F2qC0s.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtfA-F2qC0s.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Noto Sans',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vc.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAiBO9a6Vc.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/notosans/v36/o-0kIpQlx3QUlC5A4PNr4C5OaxRsfNNlKbCePevHtVtX57DGjDU1QDcea2GR.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/notosans/v36/o-0kIpQlx3QUlC5A4PNr4C5OaxRsfNNlKbCePevHtVtX57DGjDUEcDcea2GR.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Noto Serif',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notoserif/v23/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J10-WkxTkPNBNw.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notoserif/v23/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J10-WkkNl0NBNQ.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/notoserif/v23/ga6saw1J5X9T9RW6j9bNfFoWRDSesSFNh3YB9JMYMok_EPUWD_RdPA.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/notoserif/v23/ga6saw1J5X9T9RW6j9bNfFoWRDSesSFNh3YB9JMYMok_EKsVD_RdPA.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Poppins',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfecg.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFQ.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiGyp8kv8JHgFVrJJLucHtA.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/poppins/v21/pxiDyp8kv8JHgFVrJJLmy15VF9eO.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Noto Sans Arabic',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyfvHqF.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfL2ufvHqF.ttf', fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans Bengali',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosansbengali/v32/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6KmsolLideu9g.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosansbengali/v32/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6Kmsm5Mideu9g.ttf', fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans Devanagari',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosansdevanagari/v30/TuGoUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQCQmHn6B2OHjbL_08AlXQl--c5pA.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosansdevanagari/v30/TuGoUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQCQmHn6B2OHjbL_08AlZMi--c5pA.ttf', fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans JP',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosansjp/v55/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj35zS1g.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosansjp/v55/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk35zS1g.ttf', fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans KR',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosanskr/v38/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoySLPg9A.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosanskr/v38/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01SLPg9A.ttf', fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans SC',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosanssc/v39/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FrYtHaA.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosanssc/v39/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCrYtHaA.ttf', fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans Thai',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/notosansthai/v29/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5RtlzZ0RQ.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/notosansthai/v29/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU3NqlzZ0RQ.ttf', fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}

export function getFontFamily(fontName: string): string {
  const validFonts = AVAILABLE_FONTS.map(f => f.name);
  if (validFonts.includes(fontName as FontName)) {
    return fontName;
  }
  return 'Roboto';
}
