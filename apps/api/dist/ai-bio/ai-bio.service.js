"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiBioService = void 0;
const common_1 = require("@nestjs/common");
let AiBioService = class AiBioService {
    async generateBioFromPdf(concertId, file) {
        console.log(`[AiBioService] Processing PDF for concert ${concertId}, file: ${file?.originalname}`);
        return {
            bio: `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. `
                + 'Đây là tiểu sử được tạo tự động từ file PDF press kit. '
                + 'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.',
        };
    }
};
exports.AiBioService = AiBioService;
exports.AiBioService = AiBioService = __decorate([
    (0, common_1.Injectable)()
], AiBioService);
//# sourceMappingURL=ai-bio.service.js.map