"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestListModule = void 0;
const common_1 = require("@nestjs/common");
const guest_list_controller_1 = require("./guest-list.controller");
const guest_list_service_1 = require("./guest-list.service");
let GuestListModule = class GuestListModule {
};
exports.GuestListModule = GuestListModule;
exports.GuestListModule = GuestListModule = __decorate([
    (0, common_1.Module)({
        controllers: [guest_list_controller_1.GuestListController],
        providers: [guest_list_service_1.GuestListService],
        exports: [guest_list_service_1.GuestListService],
    })
], GuestListModule);
//# sourceMappingURL=guest-list.module.js.map