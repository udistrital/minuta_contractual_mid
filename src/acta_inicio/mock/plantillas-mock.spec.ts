import {
  obtenerPlantillaDeHtml,
  PDF_MOCK,
  PLANTILLAS_ACTA,
  renderizarHtmlMock,
} from './plantillas-mock';

// Render local del mock cuando plantillas_mid no responde
describe('plantillas-mock', () => {
  it('arma el HTML aunque no haya datos ni nombre de plantilla', () => {
    const html = renderizarHtmlMock('otra', undefined);
    expect(html).toContain('<h1>ACTA DE INICIO</h1>');
  });

  it('lee la plantilla del HTML y devuelve null si no la tiene', () => {
    expect(
      obtenerPlantillaDeHtml(renderizarHtmlMock(PLANTILLAS_ACTA.OBRA, {})),
    ).toBe(PLANTILLAS_ACTA.OBRA);
    expect(obtenerPlantillaDeHtml(undefined)).toBeNull();
    expect(obtenerPlantillaDeHtml('<html></html>')).toBeNull();
  });

  it('el PDF simulado es un PDF válido en base64', () => {
    expect(Buffer.from(PDF_MOCK, 'base64').subarray(0, 5).toString()).toBe(
      '%PDF-',
    );
  });
});
