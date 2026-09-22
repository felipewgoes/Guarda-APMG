export type APMGDivision =
  | 'EsFO'
  | 'EsFAEP'
  | 'ABM'
  | 'Administração'
  | 'SMB'
  | 'SEF'
  | 'Outra OPM';

export type MilitaryRank =
  | 'Cel'
  | 'Ten. Cel'
  | 'Major'
  | 'Capitão'
  | '1º Tenente'
  | '2º Tenente'
  | 'Aspirante a Oficial'
  | 'Cadete EsFO'
  | 'Subtenente'
  | '1º Sgt'
  | '2º Sgt'
  | '3º Sgt'
  | 'Cabo'
  | 'Soldado 1ª Classe'
  | 'Soldado 2ª Cl. (Aluno EsFAEP)';

export type AppTab =
  | 'leitura_rapida'
  | 'cadastro_militar'
  | 'cadastro_civil'
  | 'historico_exportacao';

export interface PopUpToastState {
  id: string;
  type: 'green' | 'red' | 'yellow';
  title: string;
  subtitle?: string;
  plate?: string;
  durationMs?: number; // 2500ms default as requested
  personPhotoUrl?: string; // Foto cadastrada da pessoa (avatar/imagem salva na base)
  rankOrDoc?: string; // [Posto/Graduação]
  warName?: string; // [Nome de Guerra]
  division?: string; // e.g. "EsFO / APMG"
  statusText?: string; // "ENTRADA REGISTRADA"
  vehicleInfo?: string;
  entryTime?: string;
}

export type PlateFormat = 'mercosul' | 'antiga' | 'outro';

export type VehicleCategory = 
  | 'Carro' 
  | 'Moto' 
  | 'Caminhão' 
  | 'Van' 
  | 'Ônibus' 
  | 'Viatura Militar' 
  | 'Utilitário' 
  | 'Outro';

export type DriverType = 'militar' | 'civil' | 'visitante' | 'fornecedor';

export type EntryPurpose = 
  | 'expediente' 
  | 'servico' 
  | 'visita' 
  | 'carga_descarga' 
  | 'instrucao' 
  | 'particular';

export interface VehicleEntry {
  id: string;
  plate: string;
  plateFormat: PlateFormat;
  vehicleType: VehicleCategory;
  brand: string;
  model: string;
  color: string;
  entryDateTime: string; // ISO string
  entryDateFormatted: string; // DD/MM/YYYY
  entryTimeFormatted: string; // HH:mm:ss
  photoBase64?: string; // Imagem original da placa
  compositePhotoUrl?: string; // Foto Composta Pericial (Placa + Watermark PMPR/APMG + PiP do Condutor)
  driverPhotoUrl?: string; // Foto individual do condutor
  inputMethod: 'camera_ai' | 'manual';
  driverName: string;
  driverType: DriverType;
  rankOrDoc: string; // e.g. "Capitão", "3º Sgt", "RG/CPF"
  warName?: string; // Nome de Guerra
  division?: APMGDivision | string; // e.g. "EsFO", "EsFAEP", "ABM", "Administração", "SMB", "SEF", "Outra OPM"
  otherOpm?: string; // e.g. "1º BPM", "BOPE", "BPRv"
  destination: string; // e.g. "EsFO", "Comando APMG", "SEF", "SMB", "Rancho"
  purpose: EntryPurpose;
  guardPost: string; // e.g. "Guarda das Armas - APMG"
  sentryName: string; // Sentinela de Serviço
  status: 'autorizado' | 'alerta' | 'bloqueado';
  notes?: string;
  createdAt: number;
}

export interface RegisteredVehicle {
  idCode?: string; // e.g. "101", "102"
  ownerName: string; // Nome Completo
  warName?: string; // Nome de Guerra e.g. "Cap. Ribeiro", "Cadete Bruno"
  cpf?: string; // e.g. "123.456.789-01"
  plate: string;
  renavam?: string; // e.g. "12345678901"
  photoUrl?: string; // Espaço para Foto / Avatar
  driverType: DriverType;
  rankOrDoc: string;
  division?: APMGDivision; // Subunidade da APMG
  otherOpm?: string; // Caso "Outra OPM"
  vehicleType: VehicleCategory;
  brand: string;
  model: string;
  color: string;
  destination: string;
  authorizationLevel: 'permanente' | 'temporaria' | 'bloqueado';
  notes?: string;
  source?: 'base_om' | 'google_forms' | 'drive_sheets' | 'manual';
  registeredAt?: string;
}

export interface DriveIntegrationConfig {
  formsUrl: string;
  sheetsUrl: string;
  autoSyncIntervalMinutes: number;
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncCount?: number;
}

export interface PlateRecognitionResult {
  plate: string;
  plateFormat: PlateFormat;
  vehicleType: VehicleCategory;
  brand: string;
  model: string;
  color: string;
  confidence: number;
  message?: string;
}
