import { guardarNota } from './escritor';
import { validarBorrador } from './esquema';
import type { Borrador } from './esquema';
import { contextoPreview, validarBorradorParcial } from './parcial';
import type { BorradorParcial, OpcionContexto } from './parcial';
import { renderPlantilla } from './plantilla';
import type { ContextoPlantilla } from './plantilla';

export { contextoPreview, guardarNota, renderPlantilla, validarBorrador, validarBorradorParcial };
export type { Borrador, BorradorParcial, ContextoPlantilla, OpcionContexto };
