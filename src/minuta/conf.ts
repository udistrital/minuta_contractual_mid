import { environment } from 'src/environments/environment';

// Configuración de plantillas por unidad ejecutora y tipo de contrato
export const plantillas: any = {
  [environment.UNIDADES_EJECUTORAS.RECTORIA]: {
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_SERVICIO]:
      '678af36658bf2385b5ccd4ec',
    [environment.TIPOS_DE_CONTRATO.ORDEN_DE_COMPRA]: '678af35258bf2385b5ccd4ea',
    [environment.TIPOS_DE_CONTRATO.ARRENDAMIENTO]: '6735191023aa35dbf941f90f',
    [environment.TIPOS_DE_CONTRATO.COMPRA_VENTA]: '',
    [environment.TIPOS_DE_CONTRATO.INTERADMINISTRATIVO]: '',
    [environment.TIPOS_DE_CONTRATO.COMISION_ESTUDIOS]: '',
    [environment.TIPOS_DE_CONTRATO.OBRA]: '678af2fb58bf2385b5ccd4e6',
    [environment.TIPOS_DE_CONTRATO.SUMINISTRO]: '678af34358bf2385b5ccd4e8',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS]:
      '678af38e58bf2385b5ccd4f0',
    [environment.TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS_PROFESIONALES]:
      '678af37d58bf2385b5ccd4ee',
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
