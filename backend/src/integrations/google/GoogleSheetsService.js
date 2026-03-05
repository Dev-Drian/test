/**
 * GoogleSheetsService - Gestiona hojas de cálculo de Google
 * 
 * Permite leer, escribir y manipular datos en Google Sheets
 * para integraciones en flujos de automatización.
 */

import { google } from 'googleapis';
import { getGoogleOAuthService } from './GoogleOAuthService.js';
import logger from '../../config/logger.js';

const log = logger.child('GoogleSheets');

class GoogleSheetsService {
  constructor() {
    this.oauthService = getGoogleOAuthService();
  }

  /**
   * Obtiene el cliente de Sheets autenticado
   * @param {object} tokens - {access_token, refresh_token}
   * @returns {google.sheets_v4.Sheets}
   */
  _getSheetsClient(tokens) {
    const auth = this.oauthService.getAuthenticatedClient(tokens);
    return google.sheets({ version: 'v4', auth });
  }

  /**
   * Obtiene el cliente de Drive para listar archivos
   * @param {object} tokens
   */
  _getDriveClient(tokens) {
    const auth = this.oauthService.getAuthenticatedClient(tokens);
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Lista las hojas de cálculo del usuario
   * @param {object} tokens - Tokens de autenticación
   * @returns {Promise<Array<{id, name}>>}
   */
  async listSpreadsheets(tokens) {
    try {
      const drive = this._getDriveClient(tokens);
      
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 50,
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
      }));
    } catch (error) {
      log.error('Error al listar hojas de cálculo', { error: error.message });
      throw new Error(`Error al obtener hojas de cálculo: ${error.message}`);
    }
  }

  /**
   * Obtiene información de una hoja de cálculo específica
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja de cálculo
   * @returns {Promise<object>}
   */
  async getSpreadsheet(tokens, spreadsheetId) {
    try {
      const sheets = this._getSheetsClient(tokens);
      
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      return {
        id: response.data.spreadsheetId,
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
          index: sheet.properties.index,
        })),
      };
    } catch (error) {
      log.error('Error al obtener hoja de cálculo', { error: error.message, spreadsheetId });
      throw new Error(`Error al obtener hoja de cálculo: ${error.message}`);
    }
  }

  /**
   * Lee datos de una hoja de cálculo
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} range - Rango a leer (ej: 'Sheet1!A1:D10')
   * @returns {Promise<Array<Array>>} Datos como matriz
   */
  async readData(tokens, spreadsheetId, range) {
    try {
      const sheets = this._getSheetsClient(tokens);
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      log.error('Error al leer datos', { error: error.message, spreadsheetId, range });
      throw new Error(`Error al leer datos: ${error.message}`);
    }
  }

  /**
   * Añade una fila al final de la hoja
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} sheetName - Nombre de la pestaña (ej: 'Sheet1')
   * @param {Array} rowData - Datos de la fila
   * @returns {Promise<object>} Resultado de la operación
   */
  async appendRow(tokens, spreadsheetId, sheetName, rowData) {
    try {
      const sheets = this._getSheetsClient(tokens);
      const range = `${sheetName}!A:ZZ`;
      
      log.info('Añadiendo fila a hoja de cálculo', { spreadsheetId, sheetName });
      
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED', // Interpreta valores como si los escribiera el usuario
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData],
        },
      });

      log.info('Fila añadida exitosamente', { 
        updatedRange: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows,
      });
      
      return {
        success: true,
        updatedRange: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows,
        updatedCells: response.data.updates?.updatedCells,
      };
    } catch (error) {
      log.error('Error al añadir fila', { error: error.message, spreadsheetId });
      throw new Error(`Error al añadir fila: ${error.message}`);
    }
  }

  /**
   * Añade múltiples filas a la hoja
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} sheetName - Nombre de la pestaña
   * @param {Array<Array>} rows - Array de filas
   * @returns {Promise<object>}
   */
  async appendRows(tokens, spreadsheetId, sheetName, rows) {
    try {
      const sheets = this._getSheetsClient(tokens);
      const range = `${sheetName}!A:ZZ`;
      
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: rows,
        },
      });

      return {
        success: true,
        updatedRows: response.data.updates?.updatedRows,
      };
    } catch (error) {
      log.error('Error al añadir filas', { error: error.message });
      throw new Error(`Error al añadir filas: ${error.message}`);
    }
  }

  /**
   * Actualiza celdas específicas
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} range - Rango a actualizar (ej: 'Sheet1!A1:B2')
   * @param {Array<Array>} values - Valores a escribir
   * @returns {Promise<object>}
   */
  async updateCells(tokens, spreadsheetId, range, values) {
    try {
      const sheets = this._getSheetsClient(tokens);
      
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values,
        },
      });

      return {
        success: true,
        updatedCells: response.data.updatedCells,
        updatedRange: response.data.updatedRange,
      };
    } catch (error) {
      log.error('Error al actualizar celdas', { error: error.message, range });
      throw new Error(`Error al actualizar celdas: ${error.message}`);
    }
  }

  /**
   * Busca una fila que coincida con criterios
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} sheetName - Nombre de la pestaña
   * @param {number} columnIndex - Índice de columna para buscar (0-based)
   * @param {string} searchValue - Valor a buscar
   * @returns {Promise<{rowIndex: number, rowData: Array} | null>}
   */
  async findRow(tokens, spreadsheetId, sheetName, columnIndex, searchValue) {
    try {
      const data = await this.readData(tokens, spreadsheetId, `${sheetName}!A:ZZ`);
      
      for (let i = 0; i < data.length; i++) {
        if (data[i][columnIndex] === searchValue) {
          return {
            rowIndex: i + 1, // 1-based para Google Sheets
            rowData: data[i],
          };
        }
      }
      
      return null;
    } catch (error) {
      log.error('Error al buscar fila', { error: error.message });
      throw new Error(`Error al buscar en la hoja: ${error.message}`);
    }
  }

  /**
   * Obtiene headers (primera fila) de la hoja
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} sheetName - Nombre de la pestaña
   * @returns {Promise<Array<string>>}
   */
  async getHeaders(tokens, spreadsheetId, sheetName) {
    try {
      const data = await this.readData(tokens, spreadsheetId, `${sheetName}!1:1`);
      return data[0] || [];
    } catch (error) {
      log.error('Error al obtener headers', { error: error.message });
      throw new Error(`Error al obtener encabezados: ${error.message}`);
    }
  }

  /**
   * Añade una fila como objeto (mapeo con headers)
   * @param {object} tokens - Tokens de autenticación
   * @param {string} spreadsheetId - ID de la hoja
   * @param {string} sheetName - Nombre de la pestaña
   * @param {object} rowObject - Objeto con {header: value}
   * @returns {Promise<object>}
   */
  async appendRowAsObject(tokens, spreadsheetId, sheetName, rowObject) {
    try {
      // Obtener headers
      const headers = await this.getHeaders(tokens, spreadsheetId, sheetName);
      
      if (headers.length === 0) {
        throw new Error('La hoja no tiene encabezados');
      }

      // Mapear objeto a array según orden de headers
      const rowData = headers.map(header => {
        const key = Object.keys(rowObject).find(k => 
          k.toLowerCase() === header.toLowerCase() || k === header
        );
        return key ? rowObject[key] : '';
      });

      return await this.appendRow(tokens, spreadsheetId, sheetName, rowData);
    } catch (error) {
      log.error('Error al añadir fila como objeto', { error: error.message });
      throw new Error(`Error al añadir fila: ${error.message}`);
    }
  }

  /**
   * Crea una nueva hoja de cálculo
   * @param {object} tokens - Tokens de autenticación
   * @param {string} title - Título de la hoja
   * @param {Array<string>} sheetNames - Nombres de las pestañas
   * @returns {Promise<{spreadsheetId, spreadsheetUrl}>}
   */
  async createSpreadsheet(tokens, title, sheetNames = ['Sheet1']) {
    try {
      const sheets = this._getSheetsClient(tokens);
      
      const response = await sheets.spreadsheets.create({
        resource: {
          properties: { title },
          sheets: sheetNames.map((name, index) => ({
            properties: { title: name, index },
          })),
        },
      });

      return {
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetUrl: response.data.spreadsheetUrl,
      };
    } catch (error) {
      log.error('Error al crear hoja de cálculo', { error: error.message });
      throw new Error(`Error al crear hoja de cálculo: ${error.message}`);
    }
  }
}

// Singleton
let instance = null;

export function getGoogleSheetsService() {
  if (!instance) {
    instance = new GoogleSheetsService();
  }
  return instance;
}

export default GoogleSheetsService;
