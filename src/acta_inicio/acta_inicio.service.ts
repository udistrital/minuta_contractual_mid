import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plantillas } from './conf';
import { environment } from 'src/environments/environment';
import axios from 'axios';

@Injectable()
export class ActaInicioService {
    constructor(private configService: ConfigService) { }

    // Función general para el procesamiento de la minuta
    async obtenerMinuta(idContrato: number) {
        try {
            // Obtener datos necesarios
            const [contratoCrud, contratoMid, documentoProveedor, actaInicio] =
                await Promise.all([
                    this.obtenerContratoGeneralCrud(idContrato),
                    this.obtenerContratoGeneralMid(idContrato),
                    this.obtenerDocumento(idContrato),
                    this.obtenerActaInicio(idContrato)
                ]);

            if (!contratoCrud || !contratoMid || !actaInicio) {
                return {
                    Success: false,
                    Status: HttpStatus.NOT_FOUND,
                    Message: `Datos de contrato incompletos`,
                };
            }

            // Obtener plantilla
            const plantilla_id = this.obtenerIdPlantilla(contratoCrud);
            if (!plantilla_id) {
                return {
                    Success: false,
                    Status: HttpStatus.NOT_FOUND,
                    Message: `Plantilla no encontrada`,
                };
            }

            // Obtener contratista
            const contratista = await this.obtenerContratista(documentoProveedor);

            // Preparar datos iniciales
            const datosIniciales = {
                contratoCrud,
                contratoMid,
                contratista,
                actaInicio
            };

            // Renderizar HTML
            const html = await this.renderizarHTML(plantilla_id, datosIniciales);

            // Generar PDF
            const pdf = await this.renderizarPDF({}, html);
            if (!pdf) {
                return {
                    Success: false,
                    Status: HttpStatus.INTERNAL_SERVER_ERROR,
                    Message: `Error al obtener minuta`,
                };
            }

            return {
                Success: true,
                Status: HttpStatus.OK,
                Message: 'Minuta generada exitosamente',
                Data: pdf,
            };
        } catch (error) {
            return {
                Success: false,
                Status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                Message: error.message || 'Error al obtener minuta',
            };
        }
    }

    // Asignación de datos iniciales
    async obtenerDatosIniciales(data: any) {
        const contrato = data.contratoCrud;
        const contratoMid = data.contratoMid;
        const contratista = data.contratista;
        const actaInicio = data.actaInicio;

        // Formatear fecha de terminación
        const fechaTerminacion = new Date(actaInicio.fecha_terminacion);

        const datos: any = {
            numero_acta: actaInicio.numero_acta || 'XXXXXXX',
            tipo_contrato: contrato.tipo_contrato_id || 'XXXXXXX',
            numero_contrato: contrato.id || 'XXXXXXX',
            objeto_contrato: contrato.objeto || 'XXXXXXX',
            valor_contrato: this.formatearAPesosColombianos(contrato.valor_pesos || 0),
            nombre_contratista: contratista.proveedor.nombre_completo_proveedor || 'XXXXXXX',
            plazo_vigencia: contrato.vigencia || 'XXXXXXX',
            fecha_iniciacion: actaInicio.fecha_iniciacion || 'XXXXXXX',
            fecha_terminacion: actaInicio.fecha_terminacion || 'XXXXXXX',
            nombre_supervisor: 'XXXXXXX', // Añadir método para obtener supervisor
            nombre_representante_legal: contratista.representante
                ? `${contratista.representante.primer_nombre} ${contratista.representante.primer_apellido}`
                : 'XXXXXXX',
            contratista: contratista.proveedor.nombre_completo_proveedor || 'XXXXXXX',
            numero_poliza: 'XXXXXXX', // Añadir método para obtener póliza
            fecha_expedicion_poliza: 'XXXXXXX',
            fecha_aprobacion_poliza: 'XXXXXXX',

            // Desglose de fecha de terminación
            día_conclusion: fechaTerminacion.getDate().toString(),
            dia_numero: fechaTerminacion.getDate(),
            mes_conclusion: fechaTerminacion.toLocaleString('es-CO', { month: 'long' }),
            year_conclusion: fechaTerminacion.getFullYear().toString()
        };

        return datos;
    }

    // Plantilla por unidad ejecutora y tipo de contrato
    obtenerIdPlantilla(contrato: any) {
        const unidadEjecutoraId = contrato.unidad_ejecutora_id;
        const tipoContratoId = contrato.tipo_contrato_id;
        return plantillas?.[unidadEjecutoraId]?.[tipoContratoId];
    }

    // Identificar si un perfil es profesional o no
    esPerfilProfesional(perfilContratista: string): boolean {
        const perfilesProfesionales = ['Profesional', 'Asesor'];
        if (perfilContratista) {
            return perfilesProfesionales.some((perfilProfesional) =>
                perfilContratista.includes(perfilProfesional),
            );
        } else {
            return false;
        }
    }

    // Formatear número a moneda colombiana
    formatearAPesosColombianos(value: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    }

    // Número de documento del contratista asociado a un contrato general
    async obtenerDocumento(idContrato: number): Promise<any> {
        try {
            const urlGestionContractualCrud: string = this.configService.get<string>(
                'GESTION_CONTRACTUAL_CRUD',
            );

            const url = `${urlGestionContractualCrud}/contratistas/contrato/${idContrato}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data?.numero_documento;
        } catch (error) {
            return null;
        }
    }

    // Información del contratista (Persona natural) o contratista y representante (Persona juridica)
    async obtenerContratista(documentoContratista: number) {
        try {
            const urlProveedoresMid: string =
                this.configService.get<string>('PROVEEDORES_MID');

            const url = `${urlProveedoresMid}/contratistas?id=${documentoContratista}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Id de argo del ordenador asociado a un contrato general
    async obtenerOrdenadorArgoId(idContrato: number) {
        try {
            const urlGestionContractualCrud: string = this.configService.get<string>(
                'GESTION_CONTRACTUAL_CRUD',
            );

            const url = `${urlGestionContractualCrud}/ordenador-contrato/contrato/${idContrato}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data?.ordenador_argo_id;
        } catch (error) {
            return null;
        }
    }

    // Información del ordenador (Argo)
    async obtenerOrdenador(idArgo: number) {
        try {
            const urlOrdenadoresSupervisoresMId: string =
                this.configService.get<string>(
                    'ORDENADORES_SUPERVISORES_CONTRATACION_MID',
                );

            const url = `${urlOrdenadoresSupervisoresMId}/ordenadores/${idArgo}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Información del representante
    obtenerRepresentante(representante: any) {
        // Desestructuración
        const {
            primer_nombre,
            segundo_nombre,
            primer_apellido,
            segundo_apellido,
            numero_documento,
            ciudad_expedicion_documento,
        } = representante || {};

        return {
            representante_nombre:
                [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido]
                    .filter(Boolean)
                    .join(' ') || 'XXXXXXX', // Unir nombres y apellidos
            representante_numero_documento: numero_documento || 'XXXXXXX',
            representante_lugar_exp: ciudad_expedicion_documento || 'XXXXXXX',
        };
    }

    // Información de un acta de inicio por su id contrato
    async obtenerActaInicio(idContrato: number): Promise<any> {
        try {
            const urlGestionContractualCrud: string = this.configService.get<string>(
                'GESTION_CONTRACTUAL_CRUD',
            );

            const url = `${urlGestionContractualCrud}/actas-inicio/${idContrato}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Información de un contrato general por su id (strings)
    async obtenerContratoGeneralCrud(idContrato: number): Promise<any> {
        try {
            const urlGestionContractualCrud: string = this.configService.get<string>(
                'GESTION_CONTRACTUAL_CRUD',
            );

            const url = `${urlGestionContractualCrud}/contratos-generales/${idContrato}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Información de un contrato general por su id (id's)
    async obtenerContratoGeneralMid(idContrato: number): Promise<any> {
        try {
            const urlGestionContractualMid: string = this.configService.get<string>(
                'GESTION_CONTRACTUAL_MID',
            );

            const url = `${urlGestionContractualMid}/contratos-generales/${idContrato}`;
            const { data } = await axios.get<any>(url);

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Generación de HTML con datos iniciales
    async renderizarHTML(plantilla_id: string, datos: any) {
        try {
            const urlPlantillasMid: string =
                this.configService.get<string>('PLANTILLAS_MID');
            const url = `${urlPlantillasMid}/plantilla/renderizar-html`;
            const { data } = await axios.post<any>(url, { plantilla_id, datos });

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Generación de minuta con datos finales
    async renderizarPDF(datos: any, html: string) {
        try {
            const urlPlantillasMid: string =
                this.configService.get<string>('PLANTILLAS_MID');

            const url = `${urlPlantillasMid}/plantilla/renderizar-pdf`;
            const { data } = await axios.post<any>(url, { datos, html });

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }
}
