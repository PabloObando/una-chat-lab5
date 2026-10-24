const assert = require('assert');

describe('Prueba que falla a propósito', () => {
  it('debe bloquear el despliegue', () => {
    assert.strictEqual(1, 2);
  });
});
