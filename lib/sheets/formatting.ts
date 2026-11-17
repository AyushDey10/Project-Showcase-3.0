import { sheets_v4 } from 'googleapis'
import { SHEET_TABS } from './config'

export interface SheetMetadata {
  id: number
  title: string
}

/**
 * Ensures all three tabs exist with the exact required names.
 * Returns a map of tab title to sheetId (integer).
 */
export async function ensureSpreadsheetTabs(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<Map<string, number>> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  })

  const existingSheets = spreadsheet.data.sheets ?? []
  const titleToId = new Map<string, number>()

  for (const s of existingSheets) {
    if (s.properties?.title && s.properties?.sheetId !== undefined && s.properties?.sheetId !== null) {
      titleToId.set(s.properties.title, s.properties.sheetId)
    }
  }

  const requiredTabs = [
    SHEET_TABS.TEAM_ATTENDANCE,
    SHEET_TABS.STUDENT_DETAILS,
    SHEET_TABS.ATTENDANCE_SUMMARY,
  ]

  const addRequests: sheets_v4.Schema$Request[] = []

  for (const tabName of requiredTabs) {
    if (!titleToId.has(tabName)) {
      addRequests.push({
        addSheet: {
          properties: {
            title: tabName,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      })
    }
  }

  if (addRequests.length > 0) {
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: addRequests },
    })

    const replies = res.data.replies ?? []
    for (const r of replies) {
      if (r.addSheet?.properties?.title && r.addSheet.properties.sheetId !== undefined && r.addSheet.properties.sheetId !== null) {
        titleToId.set(r.addSheet.properties.title, r.addSheet.properties.sheetId)
      }
    }
  }

  return titleToId
}

/**
 * Builds styling, column freezing, filtering, and conditional formatting requests for all three tabs.
 */
export function buildFormattingRequests(
  tabToId: Map<string, number>
): sheets_v4.Schema$Request[] {
  const requests: sheets_v4.Schema$Request[] = []

  const headerBgColor: sheets_v4.Schema$Color = {
    red: 15 / 255,
    green: 23 / 255,
    blue: 42 / 255,
  } // #0F172A

  const headerTextColor: sheets_v4.Schema$Color = {
    red: 248 / 255,
    green: 250 / 255,
    blue: 252 / 255,
  } // #F8FAFC

  const greenBg: sheets_v4.Schema$Color = {
    red: 220 / 255,
    green: 252 / 255,
    blue: 231 / 255,
  } // #DCFCE7
  const greenText: sheets_v4.Schema$Color = {
    red: 22 / 255,
    green: 101 / 255,
    blue: 52 / 255,
  } // #166534

  const redBg: sheets_v4.Schema$Color = {
    red: 254 / 255,
    green: 226 / 255,
    blue: 226 / 255,
  } // #FEE2E2
  const redText: sheets_v4.Schema$Color = {
    red: 153 / 255,
    green: 27 / 255,
    blue: 27 / 255,
  } // #991B1B

  const amberBg: sheets_v4.Schema$Color = {
    red: 254 / 255,
    green: 243 / 255,
    blue: 199 / 255,
  } // #FEF3C7
  const amberText: sheets_v4.Schema$Color = {
    red: 146 / 255,
    green: 64 / 255,
    blue: 14 / 255,
  } // #92400E

  // Helper to style a sheet
  const styleSheet = (sheetId: number, numCols: number) => {
    // 1. Freeze row 1
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    })

    // 2. Style Header Row
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: numCols,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: headerBgColor,
            horizontalAlignment: 'LEFT',
            textFormat: {
              bold: true,
              foregroundColor: headerTextColor,
              fontSize: 10,
            },
            padding: { top: 6, bottom: 6, left: 8, right: 8 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)',
      },
    })

    // 3. Set Basic Filter across all columns
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            startColumnIndex: 0,
            endColumnIndex: numCols,
          },
        },
      },
    })
  }

  // TAB 1: Team Attendance (24 columns)
  const tab1Id = tabToId.get(SHEET_TABS.TEAM_ATTENDANCE)
  if (tab1Id !== undefined) {
    styleSheet(tab1Id, 24)

    // Conditional formatting for Checkpoints in Tab 1 (cols 13, 16, 19: Reported, Photo ID, NOC)
    const checkpointCols = [13, 16, 19]
    for (const col of checkpointCols) {
      // Rule 1: 'Yes' -> Green
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [
              {
                sheetId: tab1Id,
                startRowIndex: 1,
                startColumnIndex: col,
                endColumnIndex: col + 1,
              },
            ],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ',
                values: [{ userEnteredValue: 'Yes' }],
              },
              format: {
                backgroundColor: greenBg,
                textFormat: { foregroundColor: greenText, bold: true },
              },
            },
          },
          index: 0,
        },
      })

      // Rule 2: 'No' -> Light Red
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [
              {
                sheetId: tab1Id,
                startRowIndex: 1,
                startColumnIndex: col,
                endColumnIndex: col + 1,
              },
            ],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ',
                values: [{ userEnteredValue: 'No' }],
              },
              format: {
                backgroundColor: redBg,
                textFormat: { foregroundColor: redText },
              },
            },
          },
          index: 1,
        },
      })
    }
  }

  // TAB 2: Student Details (10 columns)
  const tab2Id = tabToId.get(SHEET_TABS.STUDENT_DETAILS)
  if (tab2Id !== undefined) {
    styleSheet(tab2Id, 10)
  }

  // TAB 3: Attendance Summary (12 columns)
  const tab3Id = tabToId.get(SHEET_TABS.ATTENDANCE_SUMMARY)
  if (tab3Id !== undefined) {
    styleSheet(tab3Id, 12)

    // Checkpoint cols in Summary: cols 4, 5, 6
    for (let c = 4; c <= 6; c++) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [
              {
                sheetId: tab3Id,
                startRowIndex: 1,
                startColumnIndex: c,
                endColumnIndex: c + 1,
              },
            ],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ',
                values: [{ userEnteredValue: 'Yes' }],
              },
              format: {
                backgroundColor: greenBg,
                textFormat: { foregroundColor: greenText, bold: true },
              },
            },
          },
          index: 0,
        },
      })
    }

    // Percentage column formatting in Tab 3 (col 10)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId: tab3Id,
              startRowIndex: 1,
              startColumnIndex: 10,
              endColumnIndex: 11,
            },
          ],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: '100%' }],
            },
            format: {
              backgroundColor: greenBg,
              textFormat: { foregroundColor: greenText, bold: true },
            },
          },
        },
        index: 0,
      },
    })

    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId: tab3Id,
              startRowIndex: 1,
              startColumnIndex: 10,
              endColumnIndex: 11,
            },
          ],
          booleanRule: {
            condition: {
              type: 'TEXT_CONTAINS',
              values: [{ userEnteredValue: '%' }],
            },
            format: {
              backgroundColor: amberBg,
              textFormat: { foregroundColor: amberText },
            },
          },
        },
        index: 1,
      },
    })
  }

  return requests
}
