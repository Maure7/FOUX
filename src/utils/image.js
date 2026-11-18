// A foto de perfil fica dentro dos dados do workspace, que o desktop regrava a cada
// salvamento. Uma foto de câmera (vários MB em base64) deixaria toda gravação mais
// lenta, então ela é reduzida ao tamanho em que aparece.
export async function imageFileToAvatar(file, maxSize = 256) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}
