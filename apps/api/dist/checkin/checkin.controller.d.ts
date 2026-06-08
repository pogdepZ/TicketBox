import { CheckinService } from './checkin.service';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';
export declare class CheckinController {
    private readonly checkinService;
    constructor(checkinService: CheckinService);
    scan(dto: ScanCheckinDto): Promise<{
        success: boolean;
        data: {
            ticketId: string;
            status: string;
            checkedInAt: string;
        };
        message: string;
    }>;
    sync(dto: SyncCheckinDto): Promise<{
        success: boolean;
        data: {
            results: {
                ticketId: string;
                status: string;
                serverId: string;
            }[];
        };
        message: string;
    }>;
}
