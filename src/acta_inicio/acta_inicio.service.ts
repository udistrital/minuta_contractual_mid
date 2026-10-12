import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { camposPlantilla, plantillas, estiloEncabezadoPdf } from './conf';
import { environment } from 'src/environments/environment';
import axios from 'axios';
import {
    DatosActaInicioDto,
    GenerarActaInicioDto,
} from './dto/datos-acta-inicio.dto';
import {
    aFechaIso,
    descomponerFecha,
    fechaActualColombia,
    formatearDocumento,
    formatearPlazo,
    sumarPlazo,
} from './utils/formato';

const SIN_DATO = 'XXXXXXX';

@Injectable()
export class ActaInicioService {
    constructor(private configService: ConfigService) { }

    // Vista previa del acta de inicio (PDF en base64), sin guardar
    async obtenerMinuta(idContrato: number, entrada: DatosActaInicioDto = {}) {
        try {
            // Obtener datos necesarios
            const data = await this.obtenerInformacion(idContrato);
            if (!data) {
                return {
                    Success: false,
                    Status: HttpStatus.NOT_FOUND,
                    Message: `Datos de contrato incompletos`,
                };
            }

            // Obtener plantilla
            const plantilla_id = this.obtenerIdPlantilla(data.contrato);
            if (!plantilla_id) {
                return {
                    Success: false,
                    Status: HttpStatus.NOT_FOUND,
                    Message: `Plantilla no encontrada`,
                };
            }

            const datosIniciales = await this.obtenerDatosIniciales(
                data,
                entrada,
                plantilla_id,
            );

            // Renderizar HTML y generar PDF
            const html = await this.renderizarHTML(plantilla_id, datosIniciales);
            const pdf = html
                ? await this.renderizarPDF(datosIniciales, html)
                : null;
            if (!pdf) {
                return {
                    Success: false,
                    Status: HttpStatus.INTERNAL_SERVER_ERROR,
                    Message: `Error al obtener acta de inicio`,
                };
            }

            return {
                Success: true,
                Status: HttpStatus.OK,
                Message: 'Acta de inicio generada exitosamente',
                Data: {
                    pdf,
                    datos: datosIniciales,
                    campos_faltantes: this.camposFaltantes(datosIniciales, plantilla_id),
                    validacion: this.validarPrerrequisitos(data, plantilla_id),
                },
            };
        } catch (error: any) {
            return {
                Success: false,
                Status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                Message: error.message || 'Error al obtener acta de inicio',
            };
        }
    }

    // Asignación de datos iniciales (variables de la plantilla)
    async obtenerDatosIniciales(
        data: any,
        entrada: DatosActaInicioDto = {},
        plantilla_id?: string,
    ) {
        const contrato = data.contrato;
        const contratista = data.contratista;
        const actaInicio = data.actaInicio;
        const supervisor = data.supervisores[0];
        const poliza =
            data.polizas.find((item: any) => item.fecha_aprobacion) ??
            data.polizas[0];
        const representante = contratista?.representante
            ? this.obtenerRepresentante(contratista.representante)
            : null;

        // Fechas: formulario, acta registrada o contrato
        const fechaInicio =
            aFechaIso(entrada.fecha_inicio) ??
            aFechaIso(actaInicio?.fecha_inicio) ??
            aFechaIso(contrato.fecha_inicial);
        const fechaTerminacion =
            aFechaIso(entrada.fecha_terminacion) ??
            aFechaIso(actaInicio?.fecha_fin) ??
            sumarPlazo(fechaInicio, contrato.plazo_ejecucion, data.unidadEjecucion) ??
            aFechaIso(contrato.fecha_final);
        const suscripcion = descomponerFecha(
            entrada.fecha_suscripcion ?? fechaActualColombia(),
        );
        const inicio = descomponerFecha(fechaInicio);
        const terminacion = descomponerFecha(fechaTerminacion);
        const plazo = formatearPlazo(contrato.plazo_ejecucion, data.unidadEjecucion);
        const nombreContratista = contratista?.proveedor?.nombre_completo_proveedor;

        // En prestación de servicios "dia_numero" es el día de suscripción; en
        // las demás plantillas, el de terminación
        const usaConclusion = (camposPlantilla[plantilla_id] ?? []).includes(
            'dia_conclusion',
        );

        const datos: any = {
            numero_acta: entrada.numero_acta,
            tipo_contrato: contrato.tipo_contrato,
            numero_contrato: contrato.numero_contrato,
            objeto_contrato: contrato.objeto,
            valor_contrato: this.formatearAPesosColombianos(contrato.valor_pesos || 0),
            nombre_contratista: nombreContratista,
            contratista: nombreContratista,
            plazo_contrato: plazo,
            plazo_vigencia: plazo,
            valor_anticipo:
                entrada.valor_anticipo != null
                    ? this.formatearAPesosColombianos(entrada.valor_anticipo)
                    : null,
            localizacion_proyecto:
                entrada.localizacion_proyecto ??
                data.lugarEjecucion?.direccion ??
                data.dependencia,
            nombre_facultad: entrada.nombre_facultad ?? data.dependencia,
            fecha_inicio: fechaInicio,
            fecha_iniciacion: fechaInicio,
            fecha_terminacion: fechaTerminacion,
            ciudad: entrada.ciudad ?? environment.CIUDAD_SUSCRIPCION,
            dia: suscripcion?.dia_letras,
            mes: suscripcion?.mes,
            year: suscripcion?.year,
            dia_inicio: inicio?.dia_numero,
            mes_inicio: inicio?.mes,
            year_inicio: inicio?.year,

            // Supervisor e interventor
            nombre_supervisor: supervisor?.nombre_supervisor,
            cedula_supervisor: formatearDocumento(supervisor?.documento),
            ciudad_expedicion_supervisor:
                entrada.ciudad_expedicion_supervisor ??
                data.supervisorProveedor?.proveedor?.ciudad_expedicion_documento,
            nombre_interventor: entrada.nombre_interventor,

            // Contratista: en persona jurídica la cédula es del representante legal
            nombre_representante_legal:
                representante?.representante_nombre ?? nombreContratista,
            nombre_representante:
                representante?.representante_nombre ?? nombreContratista,
            cedula_contratista: representante
                ? formatearDocumento(representante.representante_numero_documento)
                : formatearDocumento(contratista?.proveedor?.numero_documento),
            ciudad_expedicion_contratista: representante
                ? representante.representante_lugar_exp
                : contratista?.proveedor?.ciudad_expedicion_documento,
            // NIT con el dígito de verificación registrado en Ágora
            nit_representante:
                [
                    formatearDocumento(contratista?.proveedor?.numero_documento),
                    contratista?.proveedor?.digito_verificacion,
                ]
                    .filter(Boolean)
                    .join('-') || null,

            // Pólizas y presupuesto
            numero_poliza: poliza?.numero_poliza,
            fecha_expedicion_poliza: aFechaIso(poliza?.fecha_expedicion),
            fecha_aprobacion_poliza: aFechaIso(poliza?.fecha_aprobacion),
            certificado_disponibilidad:
                data.cdps.map((cdp: any) => cdp.numero_cdp_id).join(', ') || null,
            valor_disponibilidad:
                entrada.valor_disponibilidad != null
                    ? this.formatearAPesosColombianos(entrada.valor_disponibilidad)
                    : null,
            valor_registro:
                entrada.valor_registro != null
                    ? this.formatearAPesosColombianos(entrada.valor_registro)
                    : null,

            // Desglose de fecha de terminación
            dia_conclusion: terminacion?.dia_letras,
            dia_numero: usaConclusion
                ? terminacion?.dia_numero
                : suscripcion?.dia_numero,
            mes_conclusion: terminacion?.mes,
            year_conclusion: terminacion?.year,
        };

        // Variables editadas en el formulario
        Object.entries(entrada.variables ?? {}).forEach(([clave, valor]) => {
            if (valor !== undefined && valor !== null && valor !== '') {
                datos[clave] = valor;
            }
        });
        Object.keys(datos).forEach((clave) => {
            if (datos[clave] === undefined || datos[clave] === null) {
                datos[clave] = SIN_DATO;
            }
        });

        // Listas de obra e interventoría (personal, maquinaria y equipos)
        datos.personal_directivo = entrada.personal_directivo ?? [];
        datos.personal_operativo = entrada.personal_operativo ?? [];
        datos.maquinaria_equipo = entrada.maquinaria_equipo ?? [];
        datos.equipos = entrada.equipos ?? [];

        return datos;
    }

    // Plantilla por unidad ejecutora y tipo de contrato
    obtenerIdPlantilla(contrato: any) {
        const unidadEjecutoraId = contrato.unidad_ejecutora_id;
        const tipoContratoId = contrato.tipo_contrato_id;
        return (
            plantillas?.[unidadEjecutoraId]?.[tipoContratoId] ??
            plantillas?.[
                this.obtenerUnidadEjecutoraPorNombre(contrato.unidad_ejecutora)
            ]?.[tipoContratoId]
        );
    }

    // Id de la unidad ejecutora en environment a partir del nombre de Parámetros
    // (p. ej. "Rectoría"), por si el contrato trae un id que no está configurado
    obtenerUnidadEjecutoraPorNombre(nombre: string) {
        const clave = String(nombre ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim();
        return environment.UNIDADES_EJECUTORAS[clave];
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

            const url = `${urlGestionContractualCrud}contratistas/contrato/${idContrato}`;
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

            const url = `${urlProveedoresMid}contratistas?id=${documentoContratista}`;
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

            const url = `${urlGestionContractualCrud}ordenador-contrato/contrato/${idContrato}`;
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

            const url = `${urlOrdenadoresSupervisoresMId}ordenadores/${idArgo}`;
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

            // El CRUD responde la lista de actas sin formato estándar
            const url = `${urlGestionContractualCrud}actas-inicio`;
            const { data } = await axios.get<any>(url);

            if (!Array.isArray(data)) {
                return null;
            }

            return (
                data
                    .filter(
                        (acta) =>
                            acta.contrato_general_id == idContrato && acta.activo,
                    )
                    .sort((a, b) => b.id - a.id)[0] ?? null
            );
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

            const url = `${urlGestionContractualCrud}contratos-generales/${idContrato}`;
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

            const url = `${urlGestionContractualMid}contratos-generales/${idContrato}?ids=true`;
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
            const url = `${urlPlantillasMid}plantilla/renderizar-html`;
            const { data } = await axios.post<any>(url, { plantilla_id, data: datos });

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

            const url = `${urlPlantillasMid}plantilla/renderizar-pdf`;
            const { data } = await axios.post<any>(url, {
                data: datos,
                html: html.replace('</head>', `${estiloEncabezadoPdf}</head>`),
            });

            if (!data.Success || data.Status != '200') {
                return null;
            }

            return data.Data;
        } catch (error) {
            return null;
        }
    }

    // Información del contrato que se usa en el acta de inicio
    async obtenerInformacion(idContrato: number): Promise<any> {
        const [
            contratoMid,
            documentoProveedor,
            actaInicio,
            supervisores,
            polizas,
            cdps,
            lugarEjecucion,
            estadoActual,
        ] = await Promise.all([
            this.obtenerContratoGeneralMid(idContrato),
            this.obtenerDocumento(idContrato),
            this.obtenerActaInicio(idContrato),
            this.consultar('GESTION_CONTRACTUAL_MID', `supervisores/contrato/${idContrato}`),
            this.consultar(
                'GESTION_CONTRACTUAL_MID',
                `polizas?query=${encodeURIComponent(JSON.stringify({ contrato_general_id: idContrato, activo: true }))}&limit=0`,
            ),
            this.consultar('GESTION_CONTRACTUAL_CRUD', `disponibilidad_presupuestal/contrato/${idContrato}`),
            this.consultar('GESTION_CONTRACTUAL_CRUD', `lugares-ejecucion/contrato/${idContrato}`),
            this.consultar('GESTION_CONTRACTUAL_CRUD', `estados-contrato/contrato/${idContrato}/actual`),
        ]);

        // Si gestion_contractual_mid no responde, se usa el contrato del CRUD
        const contrato =
            contratoMid ?? (await this.obtenerContratoGeneralCrud(idContrato));
        if (!contrato) {
            return null;
        }

        const lista = (valor: any) =>
            Array.isArray(valor) ? valor : valor ? [valor] : [];
        const lugar = lista(lugarEjecucion)[0] ?? null;
        const supervisor = lista(supervisores)[0];

        const [contratista, unidadEjecucion, supervisorProveedor, dependencia] =
            await Promise.all([
                documentoProveedor ? this.obtenerContratista(documentoProveedor) : null,
                this.consultar('PARAMETROS_CRUD', `parametro/${contrato.unidad_ejecucion_id}`),
                // Ciudad de expedición del documento del supervisor (Ágora)
                supervisor?.documento ? this.obtenerContratista(supervisor.documento) : null,
                this.obtenerDependencia(lugar?.sede_id, lugar?.dependencia_id),
            ]);

        return {
            contrato,
            contratista,
            actaInicio,
            supervisores: lista(supervisores),
            polizas: lista(polizas).filter((poliza) => poliza.activo !== false),
            cdps: lista(cdps).filter((cdp) => cdp.activo !== false),
            lugarEjecucion: lugar,
            estadoActual: estadoActual?.id ? estadoActual : null,
            unidadEjecucion: unidadEjecucion?.Nombre ?? null,
            supervisorProveedor,
            dependencia,
        };
    }

    // Datos precargados del formulario, campos faltantes y prerrequisitos
    async obtenerPrecarga(idContrato: number) {
        const data = await this.obtenerInformacion(idContrato);
        if (!data) {
            return {
                Success: false,
                Status: HttpStatus.NOT_FOUND,
                Message: `Datos de contrato incompletos`,
            };
        }
        const plantilla_id = this.obtenerIdPlantilla(data.contrato) ?? null;
        const datos = await this.obtenerDatosIniciales(data, {}, plantilla_id);

        return {
            Success: true,
            Status: HttpStatus.OK,
            Message: 'Datos del acta de inicio consultados exitosamente',
            Data: {
                plantilla_id,
                datos,
                campos_faltantes: this.camposFaltantes(datos, plantilla_id),
                validacion: this.validarPrerrequisitos(data, plantilla_id),
                acta_inicio: data.actaInicio,
            },
        };
    }

    // Genera el acta: PDF, gestor documental, registro del acta y contrato en ejecución
    async generarActaInicio(idContrato: number, entrada: GenerarActaInicioDto) {
        if (!environment.ROLES_ACTA_INICIO.includes(entrada.usuario_rol)) {
            return {
                Success: false,
                Status: HttpStatus.FORBIDDEN,
                Message: `El rol ${entrada.usuario_rol} no puede generar el acta de inicio`,
            };
        }

        const data = await this.obtenerInformacion(idContrato);
        if (!data) {
            return {
                Success: false,
                Status: HttpStatus.NOT_FOUND,
                Message: `Datos de contrato incompletos`,
            };
        }

        const plantilla_id = this.obtenerIdPlantilla(data.contrato);
        const validacion = this.validarPrerrequisitos(data, plantilla_id);
        if (!validacion.puede_generar) {
            return {
                Success: false,
                Status: HttpStatus.UNPROCESSABLE_ENTITY,
                Message: 'El contrato no cumple los prerrequisitos para el acta de inicio',
                Data: validacion,
            };
        }

        const datos = await this.obtenerDatosIniciales(data, entrada, plantilla_id);
        const faltantes = this.camposFaltantes(datos, plantilla_id);
        if (faltantes.length) {
            return {
                Success: false,
                Status: HttpStatus.UNPROCESSABLE_ENTITY,
                Message: 'Faltan datos de la plantilla del acta de inicio',
                Data: { campos_faltantes: faltantes },
            };
        }

        const html = await this.renderizarHTML(plantilla_id, datos);
        const pdf = html ? await this.renderizarPDF(datos, html) : null;
        if (!pdf) {
            return {
                Success: false,
                Status: HttpStatus.INTERNAL_SERVER_ERROR,
                Message: 'Error al generar el PDF del acta de inicio',
            };
        }

        const documento = await this.guardarEnGestorDocumental(idContrato, datos, pdf);
        if (!documento) {
            return {
                Success: false,
                Status: HttpStatus.BAD_GATEWAY,
                Message: 'Error al guardar el acta de inicio en el gestor documental',
            };
        }

        const [documentoContrato, actaInicio] = await Promise.all([
            this.registrarDocumentoContrato(idContrato, documento),
            this.guardarActaInicio(idContrato, data.actaInicio, datos, entrada),
        ]);
        const estado = actaInicio
            ? await this.registrarEstado(idContrato, data.estadoActual, entrada)
            : null;
        if (!documentoContrato || !actaInicio || !estado) {
            return {
                Success: false,
                Status: HttpStatus.INTERNAL_SERVER_ERROR,
                Message: 'El PDF se guardó, pero no se pudo registrar el acta de inicio',
                Data: { documento, documentoContrato, actaInicio, estado },
            };
        }

        return {
            Success: true,
            Status: HttpStatus.CREATED,
            Message: 'Acta de inicio generada exitosamente',
            Data: {
                pdf,
                documento: { id: documento.Id, enlace: documento.Enlace },
                acta_inicio: actaInicio,
                estado,
            },
        };
    }

    // Acta de inicio registrada para un contrato y su documento en el gestor documental
    async obtenerActaPorContrato(idContrato: number) {
        const [actaInicio, documentos, tipoDocumentoId] = await Promise.all([
            this.obtenerActaInicio(idContrato),
            this.consultar('GESTION_CONTRACTUAL_CRUD', `documentos-contratos/contrato/${idContrato}`),
            this.obtenerTipoDocumentoActa(),
        ]);
        if (!actaInicio) {
            return {
                Success: false,
                Status: HttpStatus.NOT_FOUND,
                Message: `El contrato ${idContrato} no tiene acta de inicio`,
            };
        }

        const documento =
            (Array.isArray(documentos) ? documentos : [])
                .filter(
                    (item) =>
                        item.activo !== false &&
                        tipoDocumentoId &&
                        item.tipo_documento_id === tipoDocumentoId,
                )
                .sort((a, b) => b.id - a.id)[0] ?? null;

        return {
            Success: true,
            Status: HttpStatus.OK,
            Message: 'Acta de inicio consultada exitosamente',
            Data: { acta_inicio: actaInicio, documento },
        };
    }

    // Prerrequisitos: estado, plantilla, supervisor, póliza aprobada (si aplica) y CDP
    validarPrerrequisitos(data: any, plantilla_id?: string) {
        const { SUSCRITO, LEGALIZADO } = environment.ESTADOS_GENERALES;
        const estadoId = data.estadoActual?.estado_parametro_id;
        const polizaAprobada = data.polizas.some(
            (poliza: any) => poliza.fecha_aprobacion,
        );

        const prerrequisitos = [
            {
                codigo: 'ESTADO_CONTRATO',
                descripcion: 'El contrato está suscrito o legalizado',
                cumple: [SUSCRITO, LEGALIZADO].includes(estadoId),
            },
            {
                codigo: 'PLANTILLA',
                descripcion: 'Hay plantilla para la unidad ejecutora y el tipo de contrato',
                cumple: !!plantilla_id,
            },
            {
                codigo: 'SUPERVISOR',
                descripcion: 'El contrato tiene supervisor',
                cumple: data.supervisores.length > 0,
            },
            {
                codigo: 'POLIZA',
                descripcion: 'La póliza del contrato está aprobada',
                cumple: !data.contrato.aplica_poliza || polizaAprobada,
            },
            {
                codigo: 'CDP',
                descripcion: 'El contrato tiene certificado de disponibilidad presupuestal',
                cumple: data.cdps.length > 0,
            },
        ];

        return {
            puede_generar: prerrequisitos.every((item) => item.cumple),
            prerrequisitos,
        };
    }

    // Variables obligatorias de la plantilla que no tienen valor
    camposFaltantes(datos: any, plantilla_id?: string): string[] {
        return (camposPlantilla[plantilla_id] ?? []).filter(
            (campo) => !datos[campo] || datos[campo] === SIN_DATO,
        );
    }

    // Nombre de la dependencia (facultad) desde espacios físicos de gestion_contractual_mid
    async obtenerDependencia(sedeId: number, dependenciaId: number) {
        if (!sedeId || !dependenciaId) {
            return null;
        }
        const dependencias = await this.consultar(
            'GESTION_CONTRACTUAL_MID',
            `espacios-fisicos/dependencias-sede/${sedeId}`,
        );
        return (
            (dependencias ?? []).find(
                (dependencia: any) => dependencia.id == dependenciaId,
            )?.nombre ?? null
        );
    }

    // Tipo de documento "Acta de inicio" en Parámetros (mismo tipo de la minuta)
    async obtenerTipoDocumentoActa(): Promise<number> {
        const minuta = await this.consultar(
            'PARAMETROS_CRUD',
            `parametro/${environment.TIPO_DOCUMENTO_ID_PARAMETROS.MINUTA}`,
        );
        if (!minuta?.TipoParametroId?.Id) {
            return null;
        }
        const consulta = encodeURIComponent(
            `TipoParametroId__Id:${minuta.TipoParametroId.Id},Nombre__icontains:acta de inicio,Activo:true`,
        );
        const parametros = await this.consultar(
            'PARAMETROS_CRUD',
            `parametro?query=${consulta}&limit=0`,
        );
        return parametros?.[0]?.Id ?? null;
    }

    // Guardar el PDF en el gestor documental (Nuxeo)
    async guardarEnGestorDocumental(idContrato: number, datos: any, pdf: string) {
        const respuesta = await this.enviar('post', 'GESTOR_DOCUMENTAL_MID', 'document/upload', [
            {
                IdTipoDocumento: environment.TIPO_DOCUMENTO_ID_GESTOR_DOCUMENTAL.ACTAS_DE_INICIO,
                nombre: `ACTA DE INICIO ${datos.numero_contrato}`,
                descripcion: `Acta de inicio, contrato general id ${idContrato}`,
                metadatos: {},
                file: pdf,
            },
        ]);
        return respuesta?.Status === '200' && respuesta?.res?.Id ? respuesta.res : null;
    }

    // Registrar el documento del gestor documental en gestion_contractual_crud
    async registrarDocumentoContrato(idContrato: number, documento: any) {
        const tipo_documento_id = await this.obtenerTipoDocumentoActa();
        return this.enviar('post', 'GESTION_CONTRACTUAL_CRUD', 'documentos-contratos', {
            contrato_general_id: Number(idContrato),
            documento_id: documento.Id,
            documento_enlace: documento.Enlace,
            ...(tipo_documento_id && { tipo_documento_id }),
        });
    }

    // Registrar o actualizar el acta de inicio del contrato
    async guardarActaInicio(
        idContrato: number,
        actaExistente: any,
        datos: any,
        entrada: GenerarActaInicioDto,
    ) {
        const acta = {
            usuario_id: entrada.usuario_id,
            usuario_legado: '',
            descripcion: entrada.descripcion ?? `Acta de inicio del contrato ${datos.numero_contrato}`,
            fecha_inicio: datos.fecha_inicio,
            fecha_fin: datos.fecha_terminacion,
            // Datos del formulario que no existen en otras tablas
            fecha_suscripcion:
                aFechaIso(entrada.fecha_suscripcion) ?? fechaActualColombia(),
            numero_acta: entrada.numero_acta ?? entrada.variables?.numero_acta,
            valor_disponibilidad: entrada.valor_disponibilidad,
            numero_registro_presupuestal: entrada.variables?.certificado_registro,
            valor_registro_presupuestal: entrada.valor_registro,
            valor_anticipo: entrada.valor_anticipo,
            nombre_interventor:
                entrada.nombre_interventor ?? entrada.variables?.nombre_interventor,
            contrato_general_id: Number(idContrato),
            activo: true,
        };
        return actaExistente?.id
            ? this.enviar('put', 'GESTION_CONTRACTUAL_CRUD', `actas-inicio/${actaExistente.id}`, acta)
            : this.enviar('post', 'GESTION_CONTRACTUAL_CRUD', 'actas-inicio', acta);
    }

    // Cambiar el estado del contrato a "En ejecución"
    async registrarEstado(idContrato: number, estadoActual: any, entrada: GenerarActaInicioDto) {
        return this.enviar('post', 'GESTION_CONTRACTUAL_CRUD', 'estados-contrato', {
            contrato_general_id: Number(idContrato),
            usuario_id: entrada.usuario_id,
            usuario_rol: entrada.usuario_rol,
            estado_parametro_id: environment.ESTADOS_GENERALES.EN_EJECUCION,
            estado_interno_parametro_id: estadoActual?.estado_interno_parametro_id,
            motivo: 'Acta de inicio generada',
        });
    }

    // GET a un servicio; acepta respuestas con formato estándar o sin él
    async consultar(servicio: string, ruta: string): Promise<any> {
        try {
            const url = `${this.configService.get<string>(servicio)}${ruta}`;
            const { data } = await axios.get<any>(url);
            if (data && typeof data === 'object' && 'Data' in data) {
                return data.Success === false ? null : data.Data;
            }
            return data ?? null;
        } catch {
            return null;
        }
    }

    // POST o PUT a un servicio
    async enviar(metodo: 'post' | 'put', servicio: string, ruta: string, body: any): Promise<any> {
        try {
            const url = `${this.configService.get<string>(servicio)}${ruta}`;
            const { data } = await axios[metodo]<any>(url, body);
            return data && typeof data === 'object' && 'Data' in data ? data.Data : data;
        } catch {
            return null;
        }
    }
}
