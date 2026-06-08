import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';
export declare class CheckinService {
    scan(dto: ScanCheckinDto): Promise<{
        ticketId: string;
        status: string;
        checkedInAt: string;
    }>;
    sync(dto: SyncCheckinDto): Promise<{
        results: {
            ticketId: string;
            status: string;
            serverId: string;
        }[];
    }>;
}
