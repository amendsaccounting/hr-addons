import axios from 'axios';
import Config from 'react-native-config';

// ===== CONFIGURATION SERVICE =====
class ERPNextConfig {
  private static instance: ERPNextConfig;
  
  public readonly baseUrl: string;
  public readonly methodUrl: string;
  public readonly apiKey: string;
  public readonly apiSecret: string;
  public readonly isConfigured: boolean;

  private constructor() {
    this.baseUrl = this.pickEnv('ERP_URL_RESOURCE', 'ERP_URL').replace(/\/$/, '');
    this.methodUrl = this.pickEnv('ERP_URL_METHOD', 'ERP_METHOD_URL').replace(/\/$/, '');
    this.apiKey = this.pickEnv('ERP_APIKEY', 'ERP_API_KEY');
    this.apiSecret = this.pickEnv('ERP_SECRET', 'ERP_API_SECRET');
    
    this.isConfigured = !!(this.baseUrl && this.apiKey && this.apiSecret);
  }

  public static getInstance(): ERPNextConfig {
    if (!ERPNextConfig.instance) {
      ERPNextConfig.instance = new ERPNextConfig();
    }
    return ERPNextConfig.instance;
  }

  private pickEnv(...keys: string[]): string {
    for (const key of keys) {
      const value = (Config as any)?.[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return '';
  }

  public getHeaders(contentType: string = 'application/json'): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `token ${this.apiKey}:${this.apiSecret}`,
    };
    
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    return headers;
  }
}

// ===== ERROR HANDLING =====
export class ERPNextError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ERPNextError';
  }
}

// ===== TYPES =====
export type ExpenseCategory = {
  name: string;
  expense_type: string;
};

export type ExpenseClaimInput = {
  employeeId: string;
  category: string;
  amount: string;
  expenseDate: string; 
  description: string;
  receiptUri?: string;
  receiptName?: string;
};

export type ExpenseClaimResponse = {
  success: boolean;
  claimId?: string;
  message: string;
};

export type ExpenseClaimItem = {
  name: string;
  posting_date: string;
  total_claimed_amount: number;
  total_sanctioned_amount: number;
  approval_status: string;
  docstatus: number;
  status?: string;
};

export type ExpenseHistoryView = {
  id: string;
  date: string;
  amount: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  title: string;
  description: string;
};

// ===== VALIDATION UTILITIES =====
class ValidationUtils {
  static validateExpenseClaimInput(input: ExpenseClaimInput): string | null {
    if (!input.employeeId?.trim()) return 'Employee ID is required';
    if (!input.category?.trim()) return 'Category is required';
    
    const amount = parseFloat(input.amount);
    if (isNaN(amount) || amount <= 0) return 'Valid amount is required';
    
    if (!input.expenseDate) return 'Expense date is required';
    if (!this.isValidDate(input.expenseDate)) return 'Date must be in DD/MM/YYYY format';
    
    if (!input.description?.trim()) return 'Description is required';
    if (input.description.length > 500) return 'Description too long (max 500 characters)';
    
    return null;
  }

  static isValidDate(dateStr: string): boolean {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  static isValidFileName(fileName: string): boolean {
    const invalidChars = /[<>:"/\\|?*]/;
    return !invalidChars.test(fileName) && fileName.length <= 255;
  }
}

// ===== DATE UTILITIES =====
class DateUtils {
  static formatDateToERPNext(dateStr: string): string {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    throw new Error('Invalid date format');
  }

  static getCurrentDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static formatDisplayDate(dateStr: string): string {
    // Convert yyyy-mm-dd to dd/mm/yyyy for display
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }
}

// ===== CACHE MANAGEMENT =====
class ExpenseCategoryCache {
  private static cache: string[] | null = null;
  private static lastFetch: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static get(): string[] | null {
    if (this.cache && Date.now() - this.lastFetch < this.CACHE_DURATION) {
      return this.cache;
    }
    return null;
  }

  static set(categories: string[]): void {
    this.cache = categories;
    this.lastFetch = Date.now();
  }

  static clear(): void {
    this.cache = null;
    this.lastFetch = 0;
  }
}

// ===== API SERVICE =====
class ERPNextAPIService {
  private config = ERPNextConfig.getInstance();

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    data?: any,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    if (!this.config.isConfigured) {
      throw new ERPNextError('ERPNext configuration is missing');
    }

    try {
      const response = await axios({
        method,
        url,
        data,
        headers: customHeaders || this.config.getHeaders(),
        timeout: 30000, // 30 second timeout
      });

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        const code = error.response?.status?.toString();
        throw new ERPNextError(message, code, error.response?.data);
      }
      throw new ERPNextError(error.message || 'Unknown error occurred');
    }
  }

  // ===== EMPLOYEE METHODS =====
  async getEmployeeApprover(employeeId: string): Promise<string | null> {
    try {
      const data = await this.makeRequest<any>(
        'GET',
        `${this.config.baseUrl}/Employee/${encodeURIComponent(employeeId)}`
      );
      
      const employee = data?.data ?? data;
      return employee?.expense_approver || employee?.reports_to || null;
    } catch (error) {
      console.error('Error fetching approver:', error);
      return null;
    }
  }

  // ===== FILE UPLOAD METHODS =====
  async uploadFile(uri: string, fileName: string): Promise<string | null> {
    try {
      // Validate file name
      if (!ValidationUtils.isValidFileName(fileName)) {
        throw new Error('Invalid file name');
      }

      // Check file size (10MB limit)
      const fileInfo = await RNFS.stat(uri);
      const maxSize = 10 * 1024 * 1024;
      if (fileInfo.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      const base64Data = await RNFS.readFile(uri, 'base64');
      
      // Determine MIME type
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      const formData = new FormData();
      formData.append('file', {
        uri: `data:${mimeType};base64,${base64Data}`,
        name: fileName,
        type: mimeType,
      } as any);
      formData.append('is_private', '0');
      formData.append('folder', 'Home/Attachments');

      const uploadUrl = this.config.methodUrl 
        ? `${this.config.methodUrl}/upload_file` 
        : `${this.config.baseUrl.replace('/api/resource', '')}/api/method/upload_file`;

      const response = await this.makeRequest<any>(
        'POST',
        uploadUrl,
        formData,
        this.config.getHeaders('multipart/form-data')
      );

      return response?.message?.file_url || null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  async attachFileToExpense(claimId: string, fileUrl: string): Promise<void> {
    try {
      await this.makeRequest(
        'POST',
        `${this.config.baseUrl}/File`,
        {
          file_url: fileUrl,
          attached_to_doctype: 'Expense Claim',
          attached_to_name: claimId,
        }
      );
    } catch (error) {
      console.error('Error attaching file to expense:', error);
      // Don't throw - attachment failure shouldn't fail the whole claim
    }
  }

  // ===== EXPENSE CLAIM METHODS =====
  async submitExpenseClaim(input: ExpenseClaimInput): Promise<ExpenseClaimResponse> {
    try {
      // Validate input
      const validationError = ValidationUtils.validateExpenseClaimInput(input);
      if (validationError) {
        return { success: false, message: validationError };
      }

      const employeeId = input.employeeId.trim();
      const amount = parseFloat(input.amount);

      // Get approver
      const approverId = await this.getEmployeeApprover(employeeId);
      if (!approverId) {
        return {
          success: false,
          message: 'No expense approver found for your account. Please contact HR.',
        };
      }

      // Prepare payload
      const payload = {
        doctype: 'Expense Claim',
        employee: employeeId,
        expense_approver: approverId,
        posting_date: DateUtils.getCurrentDate(),
        expenses: [
          {
            expense_type: input.category,
            expense_date: DateUtils.formatDateToERPNext(input.expenseDate),
            description: input.description,
            amount: amount,
            sanctioned_amount: amount,
          },
        ],
        total_claimed_amount: amount,
        total_sanctioned_amount: amount,
      };

      // Submit claim
      const response = await this.makeRequest<{ data: { name: string } }>(
        'POST',
        `${this.config.baseUrl}/Expense Claim`,
        payload
      );

      const claimId = response?.data?.name;
      if (!claimId) {
        return { success: false, message: 'Failed to create expense claim' };
      }

      // Handle receipt upload
      if (input.receiptUri && input.receiptName) {
        try {
          const fileUrl = await this.uploadFile(input.receiptUri, input.receiptName);
          if (fileUrl) {
            await this.attachFileToExpense(claimId, fileUrl);
          }
        } catch (uploadError) {
          console.warn('Receipt upload failed, but claim was created:', uploadError);
          // Continue even if upload fails
        }
      }

      return {
        success: true,
        claimId,
        message: `Expense claim ${claimId} submitted successfully!`,
      };
    } catch (error: any) {
      console.error('Error submitting expense claim:', error);
      
      let message = 'Failed to submit expense claim';
      if (error instanceof ERPNextError) {
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      return { success: false, message };
    }
  }

  async fetchExpenseCategories(forceRefresh = false): Promise<string[]> {
    // Return cached data if available
    if (!forceRefresh) {
      const cached = ExpenseCategoryCache.get();
      if (cached) return cached;
    }

    try {
      const response = await this.makeRequest<{ data: Array<{ name: string }> }>(
        'GET',
        `${this.config.baseUrl}/Expense Claim Type`,
        null,
        {
          ...this.config.getHeaders(),
          params: {
            fields: JSON.stringify(['name']),
            limit_page_length: 0,
          },
        }
      );

      const categories = (response?.data || []).map(c => c.name).filter(Boolean);
      
      // Cache the result
      ExpenseCategoryCache.set(categories);
      return categories;
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      
      // Return cached data even if stale, otherwise fallback
      const cached = ExpenseCategoryCache.get();
      if (cached) return cached;
      
      return ['Travel', 'Food', 'Office Supplies', 'Others'];
    }
  }

  // ===== STATUS MAPPING =====
  private mapStatus(docstatus: number, approvalStatus?: string): 'Approved' | 'Pending' | 'Rejected' {
    if (docstatus === 2) return 'Rejected';
    if (docstatus === 1 && approvalStatus === 'Approved') return 'Approved';
    if (approvalStatus === 'Rejected') return 'Rejected';
    return 'Pending';
  }

  // ===== EXPENSE HISTORY =====
  async fetchExpenseHistory(employeeId: string): Promise<ExpenseHistoryView[]> {
    try {
      const id = employeeId.trim();
      if (!id) return [];

      const response = await this.makeRequest<{ data: ExpenseClaimItem[] }>(
        'GET',
        `${this.config.baseUrl}/Expense Claim`,
        null,
        {
          ...this.config.getHeaders(),
          params: {
            filters: JSON.stringify([['employee', '=', id]]),
            fields: JSON.stringify([
              'name',
              'posting_date',
              'total_claimed_amount',
              'total_sanctioned_amount',
              'approval_status',
              'docstatus',
              'status',
            ]),
            limit_page_length: 50,
            order_by: 'creation desc',
          },
        }
      );

      const claims = response?.data || [];

      return claims.map((claim) => {
        const status = this.mapStatus(claim.docstatus, claim.approval_status || claim.status);
        return {
          id: claim.name,
          date: DateUtils.formatDisplayDate(claim.posting_date),
          amount: `$${claim.total_claimed_amount.toFixed(2)}`,
          status: status,
          title: claim.name,
          description: claim.name,
        };
      });
    } catch (error) {
      console.error('Error fetching expense history:', error);
      return [];
    }
  }

  async getExpenseClaimDetails(claimId: string): Promise<any | null> {
    try {
      const response = await this.makeRequest<any>(
        'GET',
        `${this.config.baseUrl}/Expense Claim/${encodeURIComponent(claimId)}`
      );
      return response?.data || response || null;
    } catch (error) {
      console.error('Error fetching expense details:', error);
      return null;
    }
  }

  async cancelExpenseClaim(claimId: string): Promise<ExpenseClaimResponse> {
    try {
      await this.makeRequest(
        'PUT',
        `${this.config.baseUrl}/Expense Claim/${encodeURIComponent(claimId)}`,
        { docstatus: 2 }
      );
      
      return {
        success: true,
        message: 'Expense claim cancelled successfully',
      };
    } catch (error: any) {
      const message = error instanceof ERPNextError ? error.message : 'Failed to cancel expense claim';
      return { success: false, message };
    }
  }
}

const erpNextService = new ERPNextAPIService();

export {
  erpNextService as default,
  ERPNextConfig,
  ValidationUtils,
  DateUtils,
};

// Legacy exports for backward compatibility
export const {
  fetchExpenseCategories,
  submitExpenseClaim,
  fetchExpenseHistory,
  getExpenseClaimDetails,
  cancelExpenseClaim,
} = erpNextService;

