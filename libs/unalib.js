
'use strict';

const IMAGE = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
const VIDEO = /\.(mp4|webm|ogg)$/i;

// Verificar que la URL sea válida y segura
function parsedURL(text) {
  if (typeof text !== 'string' || text !== text.trim()) {
    return null;
  }

  try {
    const url = new URL(text);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

// Obtener el identificador de un video de YouTube
function getYTVideoId(text) {
  const url = parsedURL(text);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  let id = null;

  if (['youtu.be', 'www.youtu.be'].includes(host)) {
    id = url.pathname.slice(1);
  }

  if ([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com'
  ].includes(host)) {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else if (/^\/(embed|shorts)\//.test(url.pathname)) {
      id = url.pathname.split('/')[2];
    }
  }

  return id && /^[A-Za-z0-9_-]{11}$/.test(id)
    ? id
    : null;
}

// Validar URLs de imágenes
function isImage(value) {
  const url = parsedURL(value);
  return !!url && IMAGE.test(url.pathname);
}

// Validar URLs de videos
function isVideoFile(value) {
  const url = parsedURL(value);
  return !!url && VIDEO.test(url.pathname);
}

// Generar respuesta cuando el mensaje es rechazado
function reject(error) {
  return JSON.stringify({
    valido: false,
    error
  });
}

// Validación principal de mensajes
function validarMensaje(input) {
  let data;

  try {
    data = typeof input === 'string'
      ? JSON.parse(input)
      : input;
  } catch {
    return reject('Formato JSON inválido');
  }

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.mensaje !== 'string'
  ) {
    return reject('Mensaje inválido');
  }

  const mensaje = data.mensaje.trim();

  // Evitar mensajes vacíos o demasiado largos
  if (!mensaje || mensaje.length > 2000) {
    return reject(
      'El mensaje está vacío o supera 2000 caracteres'
    );
  }

  // Bloquear etiquetas HTML y esquemas peligrosos
  if (
    /[<>]/.test(mensaje) ||
    /(?:javascript|data|vbscript)\s*:/i.test(mensaje)
  ) {
    return reject('Contenido potencialmente peligroso');
  }

  let tipo = 'texto';
  let url = '';

  // Identificar imágenes y videos
  if (isImage(mensaje)) {
    tipo = 'imagen';
    url = mensaje;

  } else if (isVideoFile(mensaje)) {
    tipo = 'video';
    url = mensaje;

  } else if (getYTVideoId(mensaje)) {
    tipo = 'youtube';
    url = mensaje;

  } else if (
    parsedURL(mensaje) ||
    /^[a-z][a-z\d+.-]*:\/\//i.test(mensaje) ||
    /^www\./i.test(mensaje)
  ) {
    return reject(
      'Solo se permiten URLs de imágenes y videos válidos'
    );
  }

  // Validar nombre del usuario
  const n = typeof data.nombre === 'string'
    ? data.nombre.trim().slice(0, 40)
    : '';

  const nombre = n && !/[<>]/.test(n)
    ? n
    : 'Anónimo';

  // Validar color hexadecimal
  const color =
    typeof data.color === 'string' &&
    /^#[\da-f]{6}$/i.test(data.color)
      ? data.color
      : '#17365d';

  // Devolver mensaje validado
  return JSON.stringify({
    valido: true,
    nombre,
    mensaje,
    tipo,
    url,
    color
  });
}

// Exportar las funciones de UNA Lib
module.exports = {
  is_valid_phone: phone =>
    typeof phone === 'string' &&
    /^[+]?[0-9()\s./-]+$/.test(phone) &&
    /\d/.test(phone),

  is_valid_url_image: isImage,

  is_valid_yt_video: value =>
    !!getYTVideoId(value),

  getYTVideoId,

  validateMessage: validarMensaje,
  validarMensaje
};
