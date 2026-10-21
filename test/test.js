var val = require('../libs/unalib');
var assert = require('assert');


describe('unalib', function(){


  describe('funcion is_valid_phone', function(){

    it('deberia devolver true para 8297-8547', function(){

      assert.equal(val.is_valid_phone('8297-8547'), true);

    });

    it('deberia devolver false para 8297p-8547', function(){

      assert.equal(val.is_valid_phone('8297p-8547'), false);

    });

  });


  describe('funcion is_valid_url_image', function(){

    it('deberia devolver true para http://image.com/image.jpg', function(){

      assert.equal(val.is_valid_url_image('http://image.com/image.jpg'), true);

    });

    it('deberia devolver true para http://image.com/image.gif', function(){

      assert.equal(val.is_valid_url_image('http://image.com/image.gif'), true);

    });
    
  });

  describe('funcion is_valid_yt_video', function(){

    it('deberia devolver true para http://image.com/image.jpg', function(){

      assert.equal(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok'), true);

    });

  });

});







const assertLab5 = require('assert');
const unaLibLab5 = require('../libs/unalib');

describe('Laboratorio 5 - Seguridad', function () {

  it('Debe aceptar una URL de imagen', function () {
    const resultado = JSON.parse(
      unaLibLab5.validarMensaje(JSON.stringify({
        nombre: 'Estudiante',
        mensaje: 'https://placehold.co/600x400.png',
        color: '#17365d'
      }))
    );

    assertLab5.strictEqual(resultado.valido, true);
    assertLab5.strictEqual(resultado.tipo, 'imagen');
  });

  it('Debe aceptar una URL de video', function () {
    const resultado = JSON.parse(
      unaLibLab5.validarMensaje(JSON.stringify({
        nombre: 'Estudiante',
        mensaje: 'https://ejemplo.com/video.mp4',
        color: '#17365d'
      }))
    );

    assertLab5.strictEqual(resultado.valido, true);
    assertLab5.strictEqual(resultado.tipo, 'video');
  });

  it('Debe reconocer videos de YouTube', function () {
    const resultado = JSON.parse(
      unaLibLab5.validarMensaje(JSON.stringify({
        nombre: 'Estudiante',
        mensaje: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        color: '#17365d'
      }))
    );

    assertLab5.strictEqual(resultado.valido, true);
    assertLab5.strictEqual(resultado.tipo, 'youtube');
  });

  it('Debe bloquear inyecciones de scripts', function () {
    const resultado = JSON.parse(
      unaLibLab5.validarMensaje(JSON.stringify({
        nombre: 'Estudiante',
        mensaje: "<script>alert('XSS')</script>",
        color: '#17365d'
      }))
    );

    assertLab5.strictEqual(resultado.valido, false);
  });

  it('Debe rechazar URLs no permitidas', function () {
    const resultado = JSON.parse(
      unaLibLab5.validarMensaje(JSON.stringify({
        nombre: 'Estudiante',
        mensaje: 'https://google.com',
        color: '#17365d'
      }))
    );

    assertLab5.strictEqual(resultado.valido, false);
  });

});


