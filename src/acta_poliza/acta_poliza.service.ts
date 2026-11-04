import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plantillas } from './conf';
import axios from 'axios';

// Fila de amparo tal como la edita el usuario antes de registrar la póliza
export interface FilaAmparoBorrador {
  id: number;
  valor?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

// Un servicio del que depende el acta no respondió o respondió con error
export class ServicioNoDisponibleError extends Error {
  constructor(public readonly servicio: string) {
    super(`Servicio no disponible: ${servicio}`);
  }
}

@Injectable()
export class ActaPolizaService {
  // TODO(#360): reemplazar por catálogo real cuando exista (igual que en el MF)
  private readonly aseguradoras: Record<number, string> = {
    1: 'Seguros del Estado',
    2: 'Seguros Bolívar',
    3: 'La Previsora Seguros',
    4: 'Aseguradora Solidaria de Colombia',
  };

  constructor(private configService: ConfigService) {}

  // Realiza una solicitud GET. Devuelve null si el recurso no existe (404) y
  // lanza ServicioNoDisponibleError si el servicio falla, para no confundir
  // una dependencia caída con un dato vacío.
  private async fetchData(url: string, servicio: string): Promise<any> {
    try {
      const { data } = await axios.get(url);
      if (Number(data.Status) === 404) return null;
      if (!data.Success || Number(data.Status) !== 200) {
        throw new ServicioNoDisponibleError(servicio);
      }
      return data.Data;
    } catch (error: any) {
      if (error instanceof ServicioNoDisponibleError) throw error;
      if (error.response?.status === 404) return null;
      throw new ServicioNoDisponibleError(servicio);
    }
  }

  // Enviar una solicitud POST
  private async postData(url: string, body: any): Promise<any> {
    try {
      const { data } = await axios.post(url, body);
      if (!data.Success || Number(data.Status) !== 200) return null;
      return data.Data;
    } catch {
      return null;
    }
  }

  // Función general para el procesamiento del acta de aprobación de póliza.
  // Con `borrador` (filas de amparos aún sin registrar) se genera una vista
  // previa con esos valores, sin exigir que ya estén vinculados a la póliza.
  async obtenerActaPoliza(idContrato: number, borrador?: FilaAmparoBorrador[]) {
    try {
      // Datos necesarios
      const [contratoCrud, documentoProveedor] = await Promise.all([
        this.obtenerContratoGeneralCrud(idContrato),
        this.obtenerDocumento(idContrato),
      ]);

      if (!contratoCrud) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Contrato no encontrado`,
        };
      }

      // Plantilla
      const plantilla_id = this.obtenerIdPlantilla(contratoCrud);
      if (!plantilla_id) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Plantilla no encontrada`,
        };
      }

      // Póliza y amparos vinculados
      const poliza = await this.obtenerPoliza(idContrato);
      if (!poliza) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Póliza no encontrada para el contrato`,
        };
      }
      const amparos = await this.obtenerAmparos(
        idContrato,
        poliza.id,
        borrador,
      );

      // Validación de consistencia
      const errores = this.validarPoliza(poliza, amparos);
      if (errores.length > 0) {
        return {
          Success: false,
          Status: HttpStatus.BAD_REQUEST,
          Message: `Póliza inconsistente: ${errores.join('; ')}`,
        };
      }

      // Contratista y unidad del plazo de ejecución
      if (!documentoProveedor) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Contratista no encontrado para el contrato`,
        };
      }
      const [contratista, unidadEjecucion] = await Promise.all([
        this.obtenerContratista(documentoProveedor),
        this.obtenerUnidadEjecucion(contratoCrud.unidad_ejecucion_id),
      ]);
      if (!contratista?.proveedor) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Contratista no encontrado en proveedores`,
        };
      }

      // Datos iniciales
      const datosIniciales = await this.obtenerDatosIniciales({
        contratoCrud,
        contratista,
        poliza,
        amparos,
        unidadEjecucion,
      });

      const html = await this.renderizarHTML(plantilla_id, datosIniciales);
      if (!html) {
        return {
          Success: false,
          Status: HttpStatus.INTERNAL_SERVER_ERROR,
          Message: `Error al generar acta de aprobación de póliza, paso 1`,
        };
      }

      // Datos finales
      const pdf = await this.renderizarPDF(datosIniciales, html);
      if (!pdf) {
        return {
          Success: false,
          Status: HttpStatus.INTERNAL_SERVER_ERROR,
          Message: `Error al generar acta de aprobación de póliza, paso 2`,
        };
      }

      return {
        Success: true,
        Status: HttpStatus.OK,
        Message: 'Acta de aprobación de póliza generada exitosamente',
        Data: pdf,
      };
    } catch (error: any) {
      if (error instanceof ServicioNoDisponibleError) {
        return {
          Success: false,
          Status: HttpStatus.BAD_GATEWAY,
          Message: error.message,
        };
      }
      return {
        Success: false,
        Status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        Message:
          error.message || 'Error al generar acta de aprobación de póliza',
      };
    }
  }

  // Asignación de datos iniciales (variables de la plantilla PAAP)
  private async obtenerDatosIniciales(data: any) {
    const {
      contratoCrud: contrato,
      contratista,
      poliza,
      amparos,
      unidadEjecucion,
    } = data;

    // Fecha del acta: aprobación de la póliza, o la actual si no existe
    const fechaActa = poliza.fecha_aprobacion
      ? new Date(poliza.fecha_aprobacion)
      : new Date();
    const dia = fechaActa.getUTCDate();

    return {
      numero_contrato: contrato.id || 'XXXXXXX',
      fecha_suscripcion: contrato.fecha_suscripcion || 'XXXXXXX',
      nombre_contratista:
        contratista?.proveedor?.nombre_completo_proveedor || 'XXXXXXX',
      objeto_contrato: contrato.objeto || 'XXXXXXX',
      entidad_aseguradora:
        this.aseguradoras[poliza.entidad_aseguradora_id] || 'XXXXXXX',
      numero_poliza: poliza.numero_poliza || 'XXXXXXX',
      plazo_ejecucion: this.formatearPlazo(
        contrato.plazo_ejecucion,
        unidadEjecucion,
      ),
      valor_contrato: this.formatearAPesosColombianos(
        contrato.valor_pesos || 0,
      ),
      amparos: amparos.map((amparo: any) => {
        const inicio = this.desglosarFecha(amparo.fecha_inicio);
        const fin = this.desglosarFecha(amparo.fecha_fin);
        return {
          tipo_amparo: amparo.amparo || 'XXXXXXX',
          unidad_porcentaje: amparo.tipo_valor_amparo_id === 1 ? 'SMLV' : '%',
          valor_unidad: this.formatearNumero(amparo.suficiencia),
          valor_asegurado: this.formatearAPesosColombianos(
            Number(amparo.valor) || 0,
          ),
          fecha_inicial_dia: inicio.dia,
          fecha_inicial_mes: inicio.mes,
          fecha_inicial_anio: inicio.anio,
          fecha_final_dia: fin.dia,
          fecha_final_mes: fin.mes,
          fecha_final_anio: fin.anio,
        };
      }),
      dias: this.numeroALetras(dia),
      dia_numero: dia,
      mes: fechaActa.toLocaleString('es-CO', {
        month: 'long',
        timeZone: 'UTC',
      }),
      year: fechaActa.getUTCFullYear(),
    };
  }

  // Validación de la póliza y sus amparos antes de generar el acta
  private validarPoliza(poliza: any, amparos: any[]): string[] {
    const errores: string[] = [];

    if (!poliza.numero_poliza) errores.push('sin número de póliza');
    if (!this.aseguradoras[poliza.entidad_aseguradora_id]) {
      errores.push('sin entidad aseguradora');
    }
    if (!poliza.fecha_inicio || !poliza.fecha_fin) {
      errores.push('sin vigencia');
    } else if (new Date(poliza.fecha_fin) < new Date(poliza.fecha_inicio)) {
      errores.push('vigencia inválida (fecha fin anterior a fecha inicio)');
    }
    if (!poliza.fecha_expedicion) errores.push('sin fecha de expedición');
    if (amparos.length === 0) errores.push('sin amparos vinculados');

    amparos.forEach((amparo) => {
      const nombre = amparo.amparo || `id ${amparo.amparo_id}`;
      if (!amparo.valor) errores.push(`amparo ${nombre} sin valor`);
      if (!amparo.fecha_inicio || !amparo.fecha_fin) {
        errores.push(`amparo ${nombre} sin vigencia`);
      } else if (new Date(amparo.fecha_fin) < new Date(amparo.fecha_inicio)) {
        errores.push(`amparo ${nombre} con vigencia inválida`);
      }
    });

    return errores;
  }

  // Plantilla por unidad ejecutora y tipo de contrato
  private obtenerIdPlantilla(contrato: any) {
    const unidadEjecutoraId = contrato.unidad_ejecutora_id;
    const tipoContratoId = contrato.tipo_contrato_id;
    return plantillas?.[unidadEjecutoraId]?.[tipoContratoId];
  }

  // Desglosar fecha ISO en día, mes (nombre) y año (UTC, evita desfase de zona)
  private desglosarFecha(value: any) {
    const fecha = value ? new Date(value) : null;
    if (!fecha || isNaN(fecha.getTime())) {
      return { dia: 'XX', mes: 'XXXXXXX', anio: 'XXXX' };
    }
    return {
      dia: fecha.getUTCDate(),
      mes: fecha.toLocaleString('es-CO', { month: 'long', timeZone: 'UTC' }),
      anio: fecha.getUTCFullYear(),
    };
  }

  // Plazo de ejecución, por ejemplo "6 Mes(es)"
  private formatearPlazo(plazo: any, unidad: string | null): string {
    if (plazo === null || plazo === undefined) return 'XXXXXXX';
    const sufijos: Record<string, string> = {
      SEGUNDOS: 'Segundo(s)',
      MINUTOS: 'Minuto(s)',
      HORAS: 'Hora(s)',
      DIAS: 'Día(s)',
      MESES: 'Mes(es)',
      AÑOS: 'Año(s)',
    };
    const nombre = unidad ? sufijos[unidad.toUpperCase()] || unidad : '';
    return `${plazo} ${nombre}`.trim();
  }

  // Número sin ceros decimales sobrantes (10.0000000 -> 10)
  private formatearNumero(value: any): string {
    const numero = Number(value);
    if (value === null || value === undefined || isNaN(numero))
      return 'XXXXXXX';
    return numero.toLocaleString('es-CO', { maximumFractionDigits: 7 });
  }

  // Día del mes (1-31) en letras
  private numeroALetras(n: number): string {
    const unidades = [
      'cero',
      'uno',
      'dos',
      'tres',
      'cuatro',
      'cinco',
      'seis',
      'siete',
      'ocho',
      'nueve',
      'diez',
      'once',
      'doce',
      'trece',
      'catorce',
      'quince',
      'dieciséis',
      'diecisiete',
      'dieciocho',
      'diecinueve',
      'veinte',
      'veintiuno',
      'veintidós',
      'veintitrés',
      'veinticuatro',
      'veinticinco',
      'veintiséis',
      'veintisiete',
      'veintiocho',
      'veintinueve',
    ];
    if (n < 30) return unidades[n];
    return n === 30 ? 'treinta' : 'treinta y uno';
  }

  // Formatear número a moneda colombiana
  private formatearAPesosColombianos(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Información de un contrato general por su id (strings)
  private async obtenerContratoGeneralCrud(idContrato: number): Promise<any> {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}contratos-generales/${idContrato}`;
    return this.fetchData(url, 'gestion_contractual_crud (contrato)');
  }

  // Número de documento del contratista asociado a un contrato general
  private async obtenerDocumento(idContrato: number): Promise<any> {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}contratistas/contrato/${idContrato}`;
    const data = await this.fetchData(
      url,
      'gestion_contractual_crud (contratista)',
    );
    return data?.numero_documento;
  }

  // Nombre de la unidad del plazo de ejecución (parámetro: DIAS, MESES, AÑOS...)
  private async obtenerUnidadEjecucion(
    unidadEjecucionId: number,
  ): Promise<string | null> {
    if (!unidadEjecucionId) return null;
    const url = `${this.configService.get<string>('PARAMETROS_CRUD')}parametro/${unidadEjecucionId}`;
    const data = await this.fetchData(
      url,
      'parametros_crud (unidad del plazo)',
    );
    return data?.Nombre || null;
  }

  // Póliza activa asociada a un contrato general
  private async obtenerPoliza(idContrato: number): Promise<any> {
    const query = encodeURIComponent(
      JSON.stringify({ contrato_general_id: idContrato, activo: true }),
    );
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_MID')}polizas?query=${query}&limit=1`;
    const data = await this.fetchData(url, 'gestion_contractual_mid (póliza)');
    return Array.isArray(data) ? data[0] : null;
  }

  // Amparos del contrato vinculados a la póliza (con nombre del amparo)
  private async obtenerAmparos(
    idContrato: number,
    polizaId: number,
    borrador?: FilaAmparoBorrador[],
  ) {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_MID')}amparos-contratos/${idContrato}`;
    const data = await this.fetchData(url, 'gestion_contractual_mid (amparos)');
    if (!Array.isArray(data)) return [];

    // Borrador: amparos de las filas enviadas, con sus valores sin registrar
    if (borrador) {
      return borrador
        .map((fila) => {
          const amparo = data.find((a: any) => a.id === fila.id);
          return amparo ? { ...amparo, ...fila } : null;
        })
        .filter(Boolean);
    }

    return data.filter((amparo: any) => amparo.poliza_id === polizaId);
  }

  // Información del contratista (Persona natural) o contratista y representante (Persona juridica)
  private async obtenerContratista(documentoContratista: number) {
    const url = `${this.configService.get<string>('PROVEEDORES_MID')}contratistas?id=${documentoContratista}`;
    return this.fetchData(url, 'proveedores_mid (contratista)');
  }

  // Generación de HTML con datos iniciales
  private async renderizarHTML(plantilla_id: string, datos: any) {
    const url = `${this.configService.get<string>('PLANTILLAS_MID')}plantilla/renderizar-html`;
    return this.postData(url, { plantilla_id, data: datos });
  }

  // Generación del acta con datos finales
  private async renderizarPDF(datos: any, html: string) {
    const url = `${this.configService.get<string>('PLANTILLAS_MID')}plantilla/renderizar-pdf`;
    return this.postData(url, { data: datos, html });
  }
}
