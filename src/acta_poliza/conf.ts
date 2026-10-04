import { environment } from 'src/environments/environment';

// Configuración de plantillas por unidad ejecutora y tipo de contrato
export const plantillas: any = {
  [environment.UNIDADES_EJECUTORAS.RECTORIA]: {
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_SERVICIO]:
      '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_COMPRA]: '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.ARRENDAMIENTO]: '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.COMPRA_VENTA]: '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.INTERADMINISTRATIVO]:
      '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.COMISION_ESTUDIOS]:
      '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.OBRA]: '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.SUMINISTRO]: '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS]:
      '679308aa655cdfe858b693ab',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS_PROFESIONALES]:
      '679308aa655cdfe858b693ab',
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
