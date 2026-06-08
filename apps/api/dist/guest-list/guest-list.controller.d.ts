import { GuestListService } from './guest-list.service';
export declare class GuestListController {
    private readonly guestListService;
    constructor(guestListService: GuestListService);
    importGuestList(concertId: string, file: Express.Multer.File): Promise<{
        success: boolean;
        data: {
            imported: number;
            duplicates: number;
            errors: number;
        };
        message: string;
    }>;
}
