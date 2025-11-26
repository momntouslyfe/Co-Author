import { Font } from '@react-pdf/renderer';

export const AVAILABLE_FONTS = [
  { name: 'Roboto', label: 'Roboto' },
  { name: 'Open Sans', label: 'Open Sans' },
  { name: 'Lato', label: 'Lato' },
  { name: 'Montserrat', label: 'Montserrat' },
  { name: 'Merriweather', label: 'Merriweather' },
  { name: 'Playfair Display', label: 'Playfair Display' },
  { name: 'Source Sans Pro', label: 'Source Sans Pro' },
  { name: 'Noto Sans', label: 'Noto Sans' },
  { name: 'Noto Serif', label: 'Noto Serif' },
  { name: 'PT Sans', label: 'PT Sans' },
  { name: 'PT Serif', label: 'PT Serif' },
  { name: 'Raleway', label: 'Raleway' },
  { name: 'Ubuntu', label: 'Ubuntu' },
  { name: 'Oswald', label: 'Oswald' },
  { name: 'Poppins', label: 'Poppins' },
  { name: 'Nunito', label: 'Nunito' },
  { name: 'Work Sans', label: 'Work Sans' },
  { name: 'Libre Baskerville', label: 'Libre Baskerville' },
  { name: 'Crimson Text', label: 'Crimson Text' },
  { name: 'EB Garamond', label: 'EB Garamond' },
] as const;

export type FontName = typeof AVAILABLE_FONTS[number]['name'];

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

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
    family: 'Montserrat',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w5aXo.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUFjIg1_i6t8kCHKm459Wx7xQYXK0vOoz6jq6R8aX8.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUFjIg1_i6t8kCHKm459Wx7xQYXK0vOoz6jq_p_aX8.ttf', fontWeight: 700, fontStyle: 'italic' },
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
    family: 'Source Sans Pro',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/sourcesanspro/v22/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7l.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/sourcesanspro/v22/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwlxdu.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/sourcesanspro/v22/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPa7gujNj.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/sourcesanspro/v22/6xKwdSBYKcSV-LCoeQqfX1RYOo3qPZZMkhdr.ttf', fontWeight: 700, fontStyle: 'italic' },
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
    family: 'PT Sans',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79P0WOxOGM.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh4OmnLD0Z.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/ptsans/v17/jizYRExUiTo99u79D0eEwMOJIDQ.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/ptsans/v17/jizdRExUiTo99u79D0e8fOytKB8c8zM.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'PT Serif',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/ptserif/v18/EJRVQgYoZZY2vCFuvAFWzr8.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/ptserif/v18/EJRSQgYoZZY2vCFuvAnt66qSVys.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/ptserif/v18/EJRTQgYoZZY2vCFuvAFT_r21cg.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/ptserif/v18/EJRQQgYoZZY2vCFuvAFSzrm_cyb-vco.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Raleway',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrE.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVs4pbCIPrE.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/raleway/v34/1Pt_g8zYS_SKggPNyCgSQamb1W0lwk4S4WjMPrQ.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/raleway/v34/1Pt_g8zYS_SKggPNyCgSQamb1W0lwk4S4bbLPrQ.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Ubuntu',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/ubuntu/v20/4iCs6KVjbNBYlgo6eA.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/ubuntu/v20/4iCv6KVjbNBYlgoCxCvjsGyN.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/ubuntu/v20/4iCu6KVjbNBYlgoKeg7z.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/ubuntu/v20/4iCp6KVjbNBYlgoKejZftWyI.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Oswald',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYySUhiC3K1BqkQo.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYyCthCC3K1BqkQo.ttf', fontWeight: 700 },
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
    family: 'Nunito',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshRTM9jo7eTWk.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDOUvRTM9jo7eTWk.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/nunito/v26/XRXK3I6Li01BKofIMNaDRs7nczIHyOwnylKmfTY3cg.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/nunito/v26/XRXK3I6Li01BKofIMNaDRs7nczIHy9YqylKmfTY3cg.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Work Sans',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/worksans/v19/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K0nXNi8JpKrE.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/worksans/v19/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K5fQNi8JpKrE.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/worksans/v19/QGY9z_wNahGAdqQ43Rh_ebrnlwyYfEPxPoGU3moJo43ZKyDSQQ.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/worksans/v19/QGY9z_wNahGAdqQ43Rh_ebrnlwyYfEPxPoGUhI2ZKyDSQQ.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Libre Baskerville',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0pNeYRI4CN2V.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKiZrc3Hgbbcjq75U4uslyuy4kn0qviTjYwI8Gcw6Oi.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKhZrc3Hgbbcjq75U4uslyuy4kn0qNcaxYaDc2V2ro.ttf', fontWeight: 400, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Crimson Text',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/crimsontext/v19/wlp2gwHKFkZgtmSR3NB0oRJvaAJSA_JN3Q.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/crimsontext/v19/wlppgwHKFkZgtmSR3NB0oRJXsCx2C9lR1LFffg.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/crimsontext/v19/wlpogwHKFkZgtmSR3NB0oRJfajhRK_Z_3rhH.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/crimsontext/v19/wlprgwHKFkZgtmSR3NB0oRJfajCqD9pZ_lJ3jC5OCQ.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'EB Garamond',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUAg.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-2fNUAg.ttf', fontWeight: 700 },
      { src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7e8QL95.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-r0be8QL95.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);

  fontsRegistered = true;
}

export function getFontFamily(fontName: string): string {
  const validFonts = AVAILABLE_FONTS.map(f => f.name);
  if (validFonts.includes(fontName as FontName)) {
    return fontName;
  }
  return 'Roboto';
}
