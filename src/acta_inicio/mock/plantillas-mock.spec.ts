import {
  definirDocumentoMock,
  obtenerPlantillaDeHtml,
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

  it('usa el título genérico y omite las tablas vacías', () => {
    const documento: any = definirDocumentoMock('otra', {});
    expect(documento.info.title).toBe('ACTA DE INICIO');
    const obra: any = definirDocumentoMock(PLANTILLAS_ACTA.OBRA, {
      numero_contrato: 'OBR-1',
    });
    expect(obra.info.title).toBe('ACTA DE INICIO CONTRATO DE OBRA OBR-1');
  });

  it('genera el PDF cuando pdfmake no trae export default', async () => {
    jest.resetModules();
    const PdfPrinter = jest.requireActual('pdfmake');
    // Módulo que es directamente el constructor de la impresora
    const Impresora: any = function (fuentes: any) {
      return new PdfPrinter(fuentes);
    };
    Impresora.__esModule = true;
    jest.doMock('pdfmake', () => Impresora);
    const { generarPdfMock, definirDocumentoMock: definir } = await import(
      './plantillas-mock'
    );
    const pdf = await generarPdfMock(definir(PLANTILLAS_ACTA.OBRA, {}));
    expect(Buffer.from(pdf, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
    jest.dontMock('pdfmake');
  });
});
