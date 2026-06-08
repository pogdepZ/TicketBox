export declare class GuestListService {
    importFromCsv(concertId: string, file: Express.Multer.File): Promise<{
        imported: number;
        duplicates: number;
        errors: number;
    }>;
}
