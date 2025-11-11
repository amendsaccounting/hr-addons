declare module 'react-native-config' {
  interface EnvConfig {
    ERP_URL_RESOURCE: string;
    ERP_URL: string;
    ERP_APIKEY: string;
    ERP_API_KEY: string;
    ERP_SECRET: string;
    ERP_API_SECRET: string;
    COMPANY_NAME: string;
    [key: string]: string;
  }
  const Config: EnvConfig;
  export default Config;
}
