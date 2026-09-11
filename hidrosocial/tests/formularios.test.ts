import { afterEach, describe, expect, test } from 'bun:test';
import { leerFormularioCaptura, sesionBorrador } from '../app/microprocesos/captura/borrador.server';
import { mismoOrigen } from '../app/microprocesos/sesion/sesion.server';

const proxyAnterior = process.env.CONFIAR_PROXY;
afterEach(() => {
  if (proxyAnterior === undefined) Reflect.deleteProperty(process.env, 'CONFIAR_PROXY');
  else process.env.CONFIAR_PROXY = proxyAnterior;
});
const url = 'http://calidad.example/calidad/captura';
function envio(headers: Record<string, string>, body = 'titulo=Prueba') {
  return new Request(url, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body });
}

describe('frontera de formularios de captura y revisión', () => {
  test('rechaza origen ausente, null, ajeno o malformado', async () => {
    for (const headers of [{}, { Origin: 'null' }, { Origin: 'https://ajeno.example' },
      { Referer: 'invalido' }, { Origin: 'https://ajeno.example', Referer: url }]) {
      await expect(leerFormularioCaptura(envio(headers))).rejects.toMatchObject({ status: 403 });
    }
  });
  test('admite origen propio o referente propio si falta Origin', async () => {
    for (const headers of [{ Origin: 'http://calidad.example' }, { Referer: url }]) {
      expect((await leerFormularioCaptura(envio(headers))).get('titulo')).toBe('Prueba');
    }
  });
  test('comprueba los bytes reales sin fiarse de Content-Length', async () => {
    for (const headers of [{ Origin: 'http://calidad.example' },
      { Origin: 'http://calidad.example', 'Content-Length': '1' }]) {
      await expect(leerFormularioCaptura(envio(headers, 'a'.repeat(160_001))))
        .rejects.toMatchObject({ status: 413 });
    }
  });
  test('cancela un cuerpo transmitido por fragmentos al superar el límite', async () => {
    let cancelado = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(90_000)); },
      cancel() { cancelado = true; },
    });
    const request = new Request(url, { method: 'POST', body,
      headers: { Origin: 'http://calidad.example', 'Content-Type': 'application/x-www-form-urlencoded' } });
    await expect(leerFormularioCaptura(request)).rejects.toMatchObject({ status: 413 });
    expect(cancelado).toBe(true);
  });
  test('proxy TLS confiable: origen HTTPS y cookie Secure; cabecera no confiable: se ignora', async () => {
    const request = envio({ Origin: 'https://calidad.example', 'X-Forwarded-Proto': 'https' });
    process.env.CONFIAR_PROXY = '1';
    expect(mismoOrigen(request)).toBe(true);
    expect((await sesionBorrador(request)).headers.get('Set-Cookie')).toContain('; Secure');
    process.env.CONFIAR_PROXY = '0';
    expect(mismoOrigen(request)).toBe(false);
    expect((await sesionBorrador(request)).headers.get('Set-Cookie')).not.toContain('; Secure');
    const directa = new Request('https://calidad.example/calidad/captura');
    expect((await sesionBorrador(directa)).headers.get('Set-Cookie')).toContain('; Secure');
  });
});
