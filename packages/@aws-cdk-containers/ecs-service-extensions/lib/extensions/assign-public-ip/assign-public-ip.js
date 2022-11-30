"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignPublicIpExtension = void 0;
const ec2 = require("@aws-cdk/aws-ec2");
const extension_interfaces_1 = require("../extension-interfaces");
const task_record_manager_1 = require("./task-record-manager");
/**
 * Modifies the service to assign a public ip to each task and optionally
 * exposes public IPs in a Route 53 record set.
 *
 * Note: If you want to change the DNS zone or record name, you will need to
 * remove this extension completely and then re-add it.
 */
class AssignPublicIpExtension extends extension_interfaces_1.ServiceExtension {
    constructor(options) {
        super('public-ip');
        this.dns = options === null || options === void 0 ? void 0 : options.dns;
    }
    hasDns() {
        return Boolean(this.dns);
    }
    prehook(service, _scope) {
        super.prehook(service, _scope);
        if (service.capacityType != extension_interfaces_1.EnvironmentCapacityType.FARGATE) {
            throw new Error('AssignPublicIp only supports Fargate tasks');
        }
    }
    modifyServiceProps(props) {
        return {
            ...props,
            assignPublicIp: true,
        };
    }
    useService(service) {
        if (this.hasDns()) {
            new task_record_manager_1.TaskRecordManager(service, 'TaskRecordManager', {
                service: service,
                dnsZone: this.dns.zone,
                dnsRecordName: this.dns.recordName,
            });
            const container = this.parentService.serviceDescription.get('service-container');
            service.connections.allowFromAnyIpv4(ec2.Port.tcp(container.trafficPort), 'Accept inbound traffic on traffic port from anywhere');
        }
    }
}
exports.AssignPublicIpExtension = AssignPublicIpExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWduLXB1YmxpYy1pcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzc2lnbi1wdWJsaWMtaXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0NBQXdDO0FBTXhDLGtFQUFrRztBQUNsRywrREFBMEQ7QUEyQjFEOzs7Ozs7R0FNRztBQUNILE1BQWEsdUJBQXdCLFNBQVEsdUNBQWdCO0lBRzNELFlBQVksT0FBd0M7UUFDbEQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5CLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLEdBQUcsQ0FBQztJQUMxQixDQUFDO0lBRU8sTUFBTTtRQUNaLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRU0sT0FBTyxDQUFDLE9BQWdCLEVBQUUsTUFBaUI7UUFDaEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFL0IsSUFBSSxPQUFPLENBQUMsWUFBWSxJQUFJLDhDQUF1QixDQUFDLE9BQU8sRUFBRTtZQUMzRCxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDL0Q7SUFDSCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBbUI7UUFDM0MsT0FBTztZQUNMLEdBQUcsS0FBSztZQUNSLGNBQWMsRUFBRSxJQUFJO1NBQ0wsQ0FBQztJQUNwQixDQUFDO0lBRU0sVUFBVSxDQUFDLE9BQTRDO1FBQzVELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2pCLElBQUksdUNBQWlCLENBQUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFO2dCQUNsRCxPQUFPLEVBQUUsT0FBTztnQkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFJLENBQUMsSUFBSTtnQkFDdkIsYUFBYSxFQUFFLElBQUksQ0FBQyxHQUFJLENBQUMsVUFBVTthQUNwQyxDQUFDLENBQUM7WUFFSCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBYyxDQUFDO1lBQzlGLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFDbkMsc0RBQXNELENBQ3ZELENBQUM7U0FDSDtJQUNILENBQUM7Q0FDRjtBQTNDRCwwREEyQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlYzIgZnJvbSAnQGF3cy1jZGsvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2UnO1xuaW1wb3J0IHsgQ29udGFpbmVyIH0gZnJvbSAnLi4vY29udGFpbmVyJztcbmltcG9ydCB7IFNlcnZpY2VFeHRlbnNpb24sIFNlcnZpY2VCdWlsZCwgRW52aXJvbm1lbnRDYXBhY2l0eVR5cGUgfSBmcm9tICcuLi9leHRlbnNpb24taW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBUYXNrUmVjb3JkTWFuYWdlciB9IGZyb20gJy4vdGFzay1yZWNvcmQtbWFuYWdlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXNzaWduUHVibGljSXBFeHRlbnNpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIEVuYWJsZSBwdWJsaXNoaW5nIHRhc2sgcHVibGljIElQcyB0byBhIHJlY29yZHNldCBpbiBhIFJvdXRlIDUzIGhvc3RlZCB6b25lLlxuICAgKlxuICAgKiBOb3RlOiBJZiB5b3Ugd2FudCB0byBjaGFuZ2UgdGhlIEROUyB6b25lIG9yIHJlY29yZCBuYW1lLCB5b3Ugd2lsbCBuZWVkIHRvXG4gICAqIHJlbW92ZSB0aGlzIGV4dGVuc2lvbiBjb21wbGV0ZWx5IGFuZCB0aGVuIHJlLWFkZCBpdC5cbiAgICovXG4gIGRucz86IEFzc2lnblB1YmxpY0lwRG5zT3B0aW9ucztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3NpZ25QdWJsaWNJcERuc09wdGlvbnMge1xuICAvKipcbiAgICogQSBETlMgWm9uZSB0byBleHBvc2UgdGFzayBJUHMgaW4uXG4gICAqL1xuICB6b25lOiByb3V0ZTUzLklIb3N0ZWRab25lO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSByZWNvcmQgdG8gYWRkIHRvIHRoZSB6b25lIGFuZCBpbiB3aGljaCB0byBhZGQgdGhlIHRhc2sgSVBcbiAgICogYWRkcmVzc2VzIHRvLlxuICAgKlxuICAgKiBAZXhhbXBsZSAnbXlzZXJ2aWNlJ1xuICAgKi9cbiAgcmVjb3JkTmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIE1vZGlmaWVzIHRoZSBzZXJ2aWNlIHRvIGFzc2lnbiBhIHB1YmxpYyBpcCB0byBlYWNoIHRhc2sgYW5kIG9wdGlvbmFsbHlcbiAqIGV4cG9zZXMgcHVibGljIElQcyBpbiBhIFJvdXRlIDUzIHJlY29yZCBzZXQuXG4gKlxuICogTm90ZTogSWYgeW91IHdhbnQgdG8gY2hhbmdlIHRoZSBETlMgem9uZSBvciByZWNvcmQgbmFtZSwgeW91IHdpbGwgbmVlZCB0b1xuICogcmVtb3ZlIHRoaXMgZXh0ZW5zaW9uIGNvbXBsZXRlbHkgYW5kIHRoZW4gcmUtYWRkIGl0LlxuICovXG5leHBvcnQgY2xhc3MgQXNzaWduUHVibGljSXBFeHRlbnNpb24gZXh0ZW5kcyBTZXJ2aWNlRXh0ZW5zaW9uIHtcbiAgZG5zPzogQXNzaWduUHVibGljSXBEbnNPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBBc3NpZ25QdWJsaWNJcEV4dGVuc2lvbk9wdGlvbnMpIHtcbiAgICBzdXBlcigncHVibGljLWlwJyk7XG5cbiAgICB0aGlzLmRucyA9IG9wdGlvbnM/LmRucztcbiAgfVxuXG4gIHByaXZhdGUgaGFzRG5zKCkge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMuZG5zKTtcbiAgfVxuXG4gIHB1YmxpYyBwcmVob29rKHNlcnZpY2U6IFNlcnZpY2UsIF9zY29wZTogQ29uc3RydWN0KSB7XG4gICAgc3VwZXIucHJlaG9vayhzZXJ2aWNlLCBfc2NvcGUpO1xuXG4gICAgaWYgKHNlcnZpY2UuY2FwYWNpdHlUeXBlICE9IEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLkZBUkdBVEUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXNzaWduUHVibGljSXAgb25seSBzdXBwb3J0cyBGYXJnYXRlIHRhc2tzJyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG1vZGlmeVNlcnZpY2VQcm9wcyhwcm9wczogU2VydmljZUJ1aWxkKTogU2VydmljZUJ1aWxkIHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4ucHJvcHMsXG4gICAgICBhc3NpZ25QdWJsaWNJcDogdHJ1ZSxcbiAgICB9IGFzIFNlcnZpY2VCdWlsZDtcbiAgfVxuXG4gIHB1YmxpYyB1c2VTZXJ2aWNlKHNlcnZpY2U6IGVjcy5FYzJTZXJ2aWNlIHwgZWNzLkZhcmdhdGVTZXJ2aWNlKSB7XG4gICAgaWYgKHRoaXMuaGFzRG5zKCkpIHtcbiAgICAgIG5ldyBUYXNrUmVjb3JkTWFuYWdlcihzZXJ2aWNlLCAnVGFza1JlY29yZE1hbmFnZXInLCB7XG4gICAgICAgIHNlcnZpY2U6IHNlcnZpY2UsXG4gICAgICAgIGRuc1pvbmU6IHRoaXMuZG5zIS56b25lLFxuICAgICAgICBkbnNSZWNvcmROYW1lOiB0aGlzLmRucyEucmVjb3JkTmFtZSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnBhcmVudFNlcnZpY2Uuc2VydmljZURlc2NyaXB0aW9uLmdldCgnc2VydmljZS1jb250YWluZXInKSBhcyBDb250YWluZXI7XG4gICAgICBzZXJ2aWNlLmNvbm5lY3Rpb25zLmFsbG93RnJvbUFueUlwdjQoXG4gICAgICAgIGVjMi5Qb3J0LnRjcChjb250YWluZXIudHJhZmZpY1BvcnQpLFxuICAgICAgICAnQWNjZXB0IGluYm91bmQgdHJhZmZpYyBvbiB0cmFmZmljIHBvcnQgZnJvbSBhbnl3aGVyZScsXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuIl19