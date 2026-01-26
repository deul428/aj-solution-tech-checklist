
export interface MasterDataRow {
  [key: string]: any;
  '자산실사일'?: string;
  '자산실사 여부'?: string;
  '센터위치'?: string;
  '구역위치'?: string;
}

export interface ChecklistData {
  mgmtNumber: string;
  productCode: string;
  productName: string;
  manufacturer: string;
  model: string;
  year: string;
  usageTime: string;
  assetNumber: string;
  vehicleNumber: string;
  serialNumber: string;
  category: '물류' | '건설' | null;
}

/**
 * 시트 헤더의 키워드와 매칭되는 상수 정의
 * 시트의 실제 헤더 이름이 조금 달라도 포함 관계를 통해 찾을 수 있도록 GAS에서 처리합니다.
 */
export const MASTER_COLUMNS = {
  MGMT_NO: '관리번호',
  PROD_NO: '자재번호',
  PROD_NAME: '자재내역',
  MANUFACTURER: '제조사명',
  MODEL_NAME: '제조사모델명',
  PROD_YEAR: '제조년도',
  ASSET_NO: '자산번호',
  VEHICLE_NO: '차량번호',
  SERIAL_NO: '시리얼번호',
  EQUIP_STATUS: '장비상태'
};

export const AUDIT_COLUMNS = {
  DATE: '자산실사일',
  STATUS: '자산실사 여부',
  CENTER: '센터위치',
  ZONE: '구역위치'
};
