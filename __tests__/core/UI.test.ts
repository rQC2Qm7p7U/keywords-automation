
import { createProjectMenu, handleOpenSidebar } from "../../src/UI";

// Mock GAS Globals for UI
const mockUi = {
    createMenu: jest.fn(),
    showSidebar: jest.fn(),
    alert: jest.fn(),
};

const mockMenu = {
    addItem: jest.fn(),
    addSeparator: jest.fn(),
    addToUi: jest.fn(),
};

const mockHtmlOutput = {
    setTitle: jest.fn(),
    setWidth: jest.fn(),
};

global.SpreadsheetApp = {
    getUi: jest.fn(() => mockUi),
} as any;

global.HtmlService = {
    createHtmlOutputFromFile: jest.fn(() => mockHtmlOutput),
} as any;


describe("UI", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Chaining setup
        (mockUi.createMenu as jest.Mock).mockReturnValue(mockMenu);
        (mockMenu.addItem as jest.Mock).mockReturnValue(mockMenu);
        (mockMenu.addSeparator as jest.Mock).mockReturnValue(mockMenu);
        (mockHtmlOutput.setTitle as jest.Mock).mockReturnValue(mockHtmlOutput);
        (mockHtmlOutput.setWidth as jest.Mock).mockReturnValue(mockHtmlOutput);
    });

    test("createProjectMenu creates menu with items", () => {
        createProjectMenu();
        expect(mockUi.createMenu).toHaveBeenCalled();
        expect(mockMenu.addItem).toHaveBeenCalledTimes(11); // 11 items in Config
        expect(mockMenu.addToUi).toHaveBeenCalled();
    });

    test("handleOpenSidebar shows sidebar", () => {
        handleOpenSidebar();
        expect(global.HtmlService.createHtmlOutputFromFile).toHaveBeenCalledWith("Sidebar");
        expect(mockHtmlOutput.setTitle).toHaveBeenCalled();
        expect(mockUi.showSidebar).toHaveBeenCalledWith(mockHtmlOutput);
    });
});
