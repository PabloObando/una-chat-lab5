const { test, expect } = require('@playwright/test');

// Medios de prueba estables (webm: Chromium de Playwright no trae códec H.264 para mp4)
const IMAGEN = 'https://picsum.photos/id/237/200/300.jpg';
const VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm';
const SCRIPT = "<script>alert('Inyección de script');</script>";

async function enviar(page, texto) {
  await page.getByLabel('Username').fill('Tester');
  await page.getByLabel('Escriba un mensaje').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('muestra una imagen enviada por URL y termina de cargar', async ({ page }) => {
  await enviar(page, IMAGEN);

  const img = page.locator('#messages img');
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', IMAGEN);
  // la imagen terminó de cargar si "complete" es true y tiene ancho real
  await expect
    .poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), { timeout: 15000 })
    .toBe(true);
});

test('muestra un reproductor de video y carga el contenido', async ({ page }) => {
  await enviar(page, VIDEO);

  const video = page.locator('#messages video');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('controls', '');
  // readyState >= 1 y duración > 0: ya cargó los metadatos del video
  await expect
    .poll(() => video.evaluate((el) => el.readyState >= 1 && el.duration > 0), { timeout: 15000 })
    .toBe(true);
});

test('el script del paso 2 no se ejecuta y el mensaje es rechazado', async ({ page }) => {
  // Se registra ANTES de enviar: si aparece un alert, la prueba falla
  const dialogos = [];
  page.on('dialog', async (dialog) => {
    dialogos.push(dialog.message());
    await dialog.dismiss();
  });

  await enviar(page, SCRIPT);

  // Mensaje normal después: confirma que el servidor ya procesó el script anterior
  await enviar(page, 'hola');
  await expect(page.locator('#messages li')).toHaveCount(1);
  await expect(page.locator('#messages li')).toContainText('hola');

  // el script fue rechazado: no se dibujó ni como texto ni como elemento
  await expect(page.locator('#messages')).not.toContainText('alert');
  await expect(page.locator('#messages script')).toHaveCount(0);
  expect(dialogos).toEqual([]);
});