export enum ErrorCode {
  InvalidRequestParams = "INVALID_REQUEST_PARAMS",
  Internal = "INTERNAL"
}


export const DEFAULT_ERROR_STATUS_CODE = 400;


export function getStatusCodeForError(code: ErrorCode) {
  switch (code) {
    case ErrorCode.InvalidRequestParams:
    case ErrorCode.Internal:
      return DEFAULT_ERROR_STATUS_CODE;
  }

  return DEFAULT_ERROR_STATUS_CODE;
}


export class LogicError extends Error {
  constructor(public code: ErrorCode, public text: string) {
    super(text);
  }
}