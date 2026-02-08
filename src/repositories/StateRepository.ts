export interface IStateRepository {
    getProperty(key: string): string | null;
    setProperty(key: string, value: string): void;
    deleteProperty(key: string): void;
}

export class StateRepository implements IStateRepository {
    getProperty(key: string): string | null {
        return PropertiesService.getScriptProperties().getProperty(key);
    }

    setProperty(key: string, value: string): void {
        PropertiesService.getScriptProperties().setProperty(key, value);
    }

    deleteProperty(key: string): void {
        PropertiesService.getScriptProperties().deleteProperty(key);
    }
}
