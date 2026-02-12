/**
 * Messages.ts
 * Все тексты, уведомления и сообщения для пользователя.
 */

export const MESSAGES = {
  WARNINGS: {
    CREATE_STRUCTURE: "ВНИМАНИЕ!\n\nСоздание новой структуры таблицы приведет к полному удалению ВСЕХ существующих данных и листов.\n\nПожалуйста, убедитесь, что вы сохранили важные данные в другом месте.\n\nВы действительно хотите продолжить?",
    CLEAR_ALL_DATA: "ВНИМАНИЕ!\n\nБудут удалены ВСЕ данные на листах:\nRaw Data, Clean Data, Clusters, Ads Data, Ads Phrase, Ads Adaptive.\n\nЗаголовки, формулы и структура сохранятся.\n\nВы действительно хотите продолжить?"
  },
  UI: {
    BUTTON_YES: "Да",
    BUTTON_CANCEL: "Отмена",
    TITLE_WARNING: "Предупреждение",
    TITLE_CLUSTERING: "Запуск кластеризации",
    CONFIRM_CLUSTERING: "Данные будут отправлены на Arsenkin.ru для кластеризации. Продолжить?",
    TITLE_TOKEN: "Введите API токен Arsenkin:",
    TOKEN_SAVED: "Токен сохранён безопасно в Script Properties.",
    TITLE_ERROR: "Ошибка",
    TITLE_SUCCESS: "Успех",
    TITLE_STATUS: "Статус задачи"
  },
  ERRORS: {
    GENERAL: "Произошла ошибка: ",
    LOCK_BUSY: "Операция заблокирована: другой пользователь сейчас работает с таблицей. Попробуйте через несколько секунд.",
    COLUMN_NOT_FOUND: "Колонка «{0}» не найдена.",
    NO_DATA: "Нет данных на листе «{0}»."
  },
  SUCCESS: {
    STRUCTURE_CREATED: "Структура таблицы успешно создана!",
    DUPLICATES_REMOVED: "Удалено дублей:\nRaw Data: {0} (осталось: {2})\nClean Data: {1} (осталось: {3})",
    NO_DUPLICATES: "✅ Дубликатов не найдено.\nRaw Data: {0} строк\nClean Data: {1} строк",
    TRANSFER_COMPLETE: "Перенесено строк: {0}.",
    NEGATIVES_COLLECTED: "Минус-слова собраны: {0} уникальных",
    NEGATIVES_NEW: "Новых: {0} (Raw: {1}, Clean: {2}, Clusters: {3})",
    NEGATIVES_EXISTING: "Уже были в Intent Types: {0}",
    NEGATIVES_NONE_NEW: "Новых минус-слов не найдено.",
    NEGATIVES_CLEANED: "Удалено минус-слов: {0} из Clean, {1} из Clusters.",
    FORMAT_COMPLETE: "Отформатировано: {0} ячеек в {1} колонках.",
    FORMAT_NO_CHANGES: "Форматирование не требуется — изменений нет.",
    CLUSTERS_TRANSFERRED: "Перенесено {0} строк из Clusters в Ads Data.",
    TASK_STARTED: "Задача создана.\nID: {0}\nСообщение: {1}",
    TASK_STATUS: "Текущий статус: {0} (Прогресс: {1})",
    CLEAR_ALL_DATA: "🧹 Очищено листов: {0} из {1}.",
    CLEAR_ALL_DATA_SKIPPED: "\nПропущены (не найдены): {0}"
  }
};
