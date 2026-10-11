export function formatNoteTimestamp(date:Date,formatUiDate:(date:Date)=>string){return `🕒 ${formatUiDate(date)} ${date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false})}`}
