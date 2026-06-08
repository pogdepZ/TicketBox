"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckinController = void 0;
const common_1 = require("@nestjs/common");
const checkin_service_1 = require("./checkin.service");
const scan_checkin_dto_1 = require("./dto/scan-checkin.dto");
const sync_checkin_dto_1 = require("./dto/sync-checkin.dto");
let CheckinController = class CheckinController {
    checkinService;
    constructor(checkinService) {
        this.checkinService = checkinService;
    }
    async scan(dto) {
        const data = await this.checkinService.scan(dto);
        return {
            success: true,
            data,
            message: 'Check-in processed successfully',
        };
    }
    async sync(dto) {
        const data = await this.checkinService.sync(dto);
        return {
            success: true,
            data,
            message: `Synced ${dto.items.length} check-in records`,
        };
    }
};
exports.CheckinController = CheckinController;
__decorate([
    (0, common_1.Post)('scan'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scan_checkin_dto_1.ScanCheckinDto]),
    __metadata("design:returntype", Promise)
], CheckinController.prototype, "scan", null);
__decorate([
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sync_checkin_dto_1.SyncCheckinDto]),
    __metadata("design:returntype", Promise)
], CheckinController.prototype, "sync", null);
exports.CheckinController = CheckinController = __decorate([
    (0, common_1.Controller)('checkin'),
    __metadata("design:paramtypes", [checkin_service_1.CheckinService])
], CheckinController);
//# sourceMappingURL=checkin.controller.js.map