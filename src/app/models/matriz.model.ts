export interface TituloV {
  idMatrizTituloV: number;
  nombre: string;
}

export interface TituloH {
  idMatrizTituloH: number;
  nombre: string;
}

export interface TipoTituloH {
  id: number;
  nombre?: string;
}

export interface TipoTituloV {
  id: number;
  nombre?: string;
}

export type TituloHConTipo = TituloH & { tipoTituloH?: TipoTituloH };
export type TituloVConTipo = TituloV & { tipoTituloV?: TipoTituloV };


export interface Canal {
  idMatrizCanal: number;
  nombre: string;
}

export interface MatrizDoc {
  idMatrizConfiguracion: number;
  tituloV: TituloV;
  tituloH: TituloH;
  canal: Canal;
}

export interface MatrizResponse {
  filas: TituloV[];
  columnas: TituloH[];
  canales: Canal[];
  celdas: MatrizDoc[];
}

/* ================= DOCUMENTOS ================= */

export interface Documento {
  idMatrizDocumento: number;
  codigo?: string;
  nombre?: string;
  urlDoc?: string;
  urlPdf?: string;
  tipoDoc: { idMatrizTipoDoc: number; nombre: string };
  nivelAcceso: { idMatrizNivelAcceso: number; nombre: string };
}

export interface CrearDocumentoDto {
  idMatrizTipoDoc: number;
  idMatrizNivelAcceso: number;
  idMatrizConfiguracion: number;
  idMatrizTituloH?: number;
  codigo?: string;
  nombre?: string;
  urlDoc?: string;
  urlPdf?: string;
}

export interface ActualizarDocumentoDto {
  idMatrizTipoDoc?: number;
  idMatrizNivelAcceso?: number;
  codigo?: string;
  nombre?: string;
  urlDoc?: string;
  urlPdf?: string;
}
