import { environment } from 'src/environments/environment';

// Configuración de plantillas por unidad ejecutora y tipo de contrato
export const plantillas: any = {
  [environment.UNIDADES_EJECUTORAS.RECTORIA]: {
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_SERVICIO]:'',
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_COMPRA]: '',
    [environment.TIPOS_DE_CONTRATO.ARRENDAMIENTO]: '',
    [environment.TIPOS_DE_CONTRATO.COMPRA_VENTA]: '67930c80206ae652dbeb3d0d',
    [environment.TIPOS_DE_CONTRATO.INTERADMINISTRATIVO]: '67930b1a206ae652dbeb3d07',
    [environment.TIPOS_DE_CONTRATO.COMISION_ESTUDIOS]: '',
    [environment.TIPOS_DE_CONTRATO.OBRA]: '67930bb0206ae652dbeb3d09',
    [environment.TIPOS_DE_CONTRATO.SUMINISTRO]: '',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS]:'67930c2a206ae652dbeb3d0b',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS_PROFESIONALES]:'67930c2a206ae652dbeb3d0b',
  },
  [environment.UNIDADES_EJECUTORAS.IDEXUD]: {
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_SERVICIO]: '',
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_COMPRA]: '',
    [environment.TIPOS_DE_CONTRATO.ARRENDAMIENTO]: '',
    [environment.TIPOS_DE_CONTRATO.COMPRA_VENTA]: '',
    [environment.TIPOS_DE_CONTRATO.INTERADMINISTRATIVO]: '',
    [environment.TIPOS_DE_CONTRATO.COMISION_ESTUDIOS]: '',
    [environment.TIPOS_DE_CONTRATO.OBRA]: '',
    [environment.TIPOS_DE_CONTRATO.SUMINISTRO]: '',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS]: '',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS_PROFESIONALES]: '',
  },
};