/**
 * Messages.gs
 * Contains all the text strings, alerts, and messages used in the UI.
 */

export const MESSAGES = {
  WARNINGS: {
    CREATE_STRUCTURE: "ВНИМАНИЕ!\n\nСоздание новой структуры таблицы приведет к полному удалению ВСЕХ существующих данных и листов.\n\nПожалуйста, убедитесь, что вы сохранили важные данные в другом месте.\n\nВы действительно хотите продолжить?"
  },
  UI: {
    BUTTON_YES: "Да",
    BUTTON_CANCEL: "Отмена",
    TITLE_WARNING: "Предупреждение"
  },
  ERRORS: {
    GENERAL: "Произошла ошибка: "
  },
  SUCCESS: {
    STRUCTURE_CREATED: "Структура таблицы успешно создана!",
    DUPLICATES_REMOVED: "Удалено дублей:\nRaw Data: {0} (осталось: {2})\nClean Data: {1} (осталось: {3})",
    NO_DUPLICATES: "✅ Дубликатов не найдено.\nRaw Data: {0} строк\nClean Data: {1} строк"
  }
};
