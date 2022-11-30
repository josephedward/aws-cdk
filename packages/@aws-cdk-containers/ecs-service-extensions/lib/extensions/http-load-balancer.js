"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpLoadBalancerExtension = void 0;
const alb = require("@aws-cdk/aws-elasticloadbalancingv2");
const cdk = require("@aws-cdk/core");
const extension_interfaces_1 = require("./extension-interfaces");
/**
 * This extension add a public facing load balancer for sending traffic
 * to one or more replicas of the application container.
 */
class HttpLoadBalancerExtension extends extension_interfaces_1.ServiceExtension {
    constructor(props = {}) {
        super('load-balancer');
        this.requestsPerTarget = props.requestsPerTarget;
    }
    // Before the service is created, go ahead and create the load balancer itself.
    prehook(service, scope) {
        this.parentService = service;
        this.loadBalancer = new alb.ApplicationLoadBalancer(scope, `${this.parentService.id}-load-balancer`, {
            vpc: this.parentService.vpc,
            internetFacing: true,
        });
        this.listener = this.loadBalancer.addListener(`${this.parentService.id}-listener`, {
            port: 80,
            open: true,
        });
        // Automatically create an output
        new cdk.CfnOutput(scope, `${this.parentService.id}-load-balancer-dns-output`, {
            value: this.loadBalancer.loadBalancerDnsName,
        });
    }
    // Minor service configuration tweaks to work better with a load balancer
    modifyServiceProps(props) {
        return {
            ...props,
            // Give the task a little bit of grace time to start passing
            // healthchecks. Without this it is possible for a slow starting task
            // to cause the ALB to consider the task unhealthy, causing ECS to stop
            // the task before it actually has a chance to finish starting up
            healthCheckGracePeriod: cdk.Duration.minutes(1),
        };
    }
    // After the service is created add the service to the load balancer's listener
    useService(service) {
        const targetGroup = this.listener.addTargets(this.parentService.id, {
            deregistrationDelay: cdk.Duration.seconds(10),
            port: 80,
            targets: [service],
        });
        if (this.requestsPerTarget) {
            if (!this.parentService.scalableTaskCount) {
                throw Error(`Auto scaling target for the service '${this.parentService.id}' hasn't been configured. Please use Service construct to configure 'minTaskCount' and 'maxTaskCount'.`);
            }
            this.parentService.scalableTaskCount.scaleOnRequestCount(`${this.parentService.id}-target-request-count-${this.requestsPerTarget}`, {
                requestsPerTarget: this.requestsPerTarget,
                targetGroup,
            });
            this.parentService.enableAutoScalingPolicy();
        }
    }
}
exports.HttpLoadBalancerExtension = HttpLoadBalancerExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1sb2FkLWJhbGFuY2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cC1sb2FkLWJhbGFuY2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDJEQUEyRDtBQUMzRCxxQ0FBcUM7QUFHckMsaUVBQXdFO0FBU3hFOzs7R0FHRztBQUNILE1BQWEseUJBQTBCLFNBQVEsdUNBQWdCO0lBSzdELFlBQVksUUFBK0IsRUFBRTtRQUMzQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztJQUNuRCxDQUFDO0lBRUQsK0VBQStFO0lBQ3hFLE9BQU8sQ0FBQyxPQUFnQixFQUFFLEtBQWdCO1FBQy9DLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDO1FBRTdCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGdCQUFnQixFQUFFO1lBQ25HLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUc7WUFDM0IsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxXQUFXLEVBQUU7WUFDakYsSUFBSSxFQUFFLEVBQUU7WUFDUixJQUFJLEVBQUUsSUFBSTtTQUNYLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLDJCQUEyQixFQUFFO1lBQzVFLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQjtTQUM3QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQseUVBQXlFO0lBQ2xFLGtCQUFrQixDQUFDLEtBQW1CO1FBQzNDLE9BQU87WUFDTCxHQUFHLEtBQUs7WUFFUiw0REFBNEQ7WUFDNUQscUVBQXFFO1lBQ3JFLHVFQUF1RTtZQUN2RSxpRUFBaUU7WUFDakUsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ2hDLENBQUM7SUFDcEIsQ0FBQztJQUVELCtFQUErRTtJQUN4RSxVQUFVLENBQUMsT0FBNEM7UUFDNUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUU7WUFDbEUsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdDLElBQUksRUFBRSxFQUFFO1lBQ1IsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDO1NBQ25CLENBQUMsQ0FBQztRQUVILElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFO2dCQUN6QyxNQUFNLEtBQUssQ0FBQyx3Q0FBd0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLHdHQUF3RyxDQUFDLENBQUM7YUFDcEw7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLHlCQUF5QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtnQkFDbEksaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtnQkFDekMsV0FBVzthQUNaLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztTQUM5QztJQUNILENBQUM7Q0FDRjtBQTlERCw4REE4REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBhbGIgZnJvbSAnQGF3cy1jZGsvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZSc7XG5pbXBvcnQgeyBTZXJ2aWNlRXh0ZW5zaW9uLCBTZXJ2aWNlQnVpbGQgfSBmcm9tICcuL2V4dGVuc2lvbi1pbnRlcmZhY2VzJztcblxuZXhwb3J0IGludGVyZmFjZSBIdHRwTG9hZEJhbGFuY2VyUHJvcHMge1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBBTEIgcmVxdWVzdHMgcGVyIHRhcmdldC5cbiAgICovXG4gIHJlYWRvbmx5IHJlcXVlc3RzUGVyVGFyZ2V0PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRoaXMgZXh0ZW5zaW9uIGFkZCBhIHB1YmxpYyBmYWNpbmcgbG9hZCBiYWxhbmNlciBmb3Igc2VuZGluZyB0cmFmZmljXG4gKiB0byBvbmUgb3IgbW9yZSByZXBsaWNhcyBvZiB0aGUgYXBwbGljYXRpb24gY29udGFpbmVyLlxuICovXG5leHBvcnQgY2xhc3MgSHR0cExvYWRCYWxhbmNlckV4dGVuc2lvbiBleHRlbmRzIFNlcnZpY2VFeHRlbnNpb24ge1xuICBwcml2YXRlIGxvYWRCYWxhbmNlciE6IGFsYi5JQXBwbGljYXRpb25Mb2FkQmFsYW5jZXI7XG4gIHByaXZhdGUgbGlzdGVuZXIhOiBhbGIuSUFwcGxpY2F0aW9uTGlzdGVuZXI7XG4gIHByaXZhdGUgcmVxdWVzdHNQZXJUYXJnZXQ/OiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocHJvcHM6IEh0dHBMb2FkQmFsYW5jZXJQcm9wcyA9IHt9KSB7XG4gICAgc3VwZXIoJ2xvYWQtYmFsYW5jZXInKTtcbiAgICB0aGlzLnJlcXVlc3RzUGVyVGFyZ2V0ID0gcHJvcHMucmVxdWVzdHNQZXJUYXJnZXQ7XG4gIH1cblxuICAvLyBCZWZvcmUgdGhlIHNlcnZpY2UgaXMgY3JlYXRlZCwgZ28gYWhlYWQgYW5kIGNyZWF0ZSB0aGUgbG9hZCBiYWxhbmNlciBpdHNlbGYuXG4gIHB1YmxpYyBwcmVob29rKHNlcnZpY2U6IFNlcnZpY2UsIHNjb3BlOiBDb25zdHJ1Y3QpIHtcbiAgICB0aGlzLnBhcmVudFNlcnZpY2UgPSBzZXJ2aWNlO1xuXG4gICAgdGhpcy5sb2FkQmFsYW5jZXIgPSBuZXcgYWxiLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHNjb3BlLCBgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LWxvYWQtYmFsYW5jZXJgLCB7XG4gICAgICB2cGM6IHRoaXMucGFyZW50U2VydmljZS52cGMsXG4gICAgICBpbnRlcm5ldEZhY2luZzogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHRoaXMubGlzdGVuZXIgPSB0aGlzLmxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcihgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LWxpc3RlbmVyYCwge1xuICAgICAgcG9ydDogODAsXG4gICAgICBvcGVuOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQXV0b21hdGljYWxseSBjcmVhdGUgYW4gb3V0cHV0XG4gICAgbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsIGAke3RoaXMucGFyZW50U2VydmljZS5pZH0tbG9hZC1iYWxhbmNlci1kbnMtb3V0cHV0YCwge1xuICAgICAgdmFsdWU6IHRoaXMubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgfSk7XG4gIH1cblxuICAvLyBNaW5vciBzZXJ2aWNlIGNvbmZpZ3VyYXRpb24gdHdlYWtzIHRvIHdvcmsgYmV0dGVyIHdpdGggYSBsb2FkIGJhbGFuY2VyXG4gIHB1YmxpYyBtb2RpZnlTZXJ2aWNlUHJvcHMocHJvcHM6IFNlcnZpY2VCdWlsZCk6IFNlcnZpY2VCdWlsZCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnByb3BzLFxuXG4gICAgICAvLyBHaXZlIHRoZSB0YXNrIGEgbGl0dGxlIGJpdCBvZiBncmFjZSB0aW1lIHRvIHN0YXJ0IHBhc3NpbmdcbiAgICAgIC8vIGhlYWx0aGNoZWNrcy4gV2l0aG91dCB0aGlzIGl0IGlzIHBvc3NpYmxlIGZvciBhIHNsb3cgc3RhcnRpbmcgdGFza1xuICAgICAgLy8gdG8gY2F1c2UgdGhlIEFMQiB0byBjb25zaWRlciB0aGUgdGFzayB1bmhlYWx0aHksIGNhdXNpbmcgRUNTIHRvIHN0b3BcbiAgICAgIC8vIHRoZSB0YXNrIGJlZm9yZSBpdCBhY3R1YWxseSBoYXMgYSBjaGFuY2UgdG8gZmluaXNoIHN0YXJ0aW5nIHVwXG4gICAgICBoZWFsdGhDaGVja0dyYWNlUGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcbiAgICB9IGFzIFNlcnZpY2VCdWlsZDtcbiAgfVxuXG4gIC8vIEFmdGVyIHRoZSBzZXJ2aWNlIGlzIGNyZWF0ZWQgYWRkIHRoZSBzZXJ2aWNlIHRvIHRoZSBsb2FkIGJhbGFuY2VyJ3MgbGlzdGVuZXJcbiAgcHVibGljIHVzZVNlcnZpY2Uoc2VydmljZTogZWNzLkVjMlNlcnZpY2UgfCBlY3MuRmFyZ2F0ZVNlcnZpY2UpIHtcbiAgICBjb25zdCB0YXJnZXRHcm91cCA9IHRoaXMubGlzdGVuZXIuYWRkVGFyZ2V0cyh0aGlzLnBhcmVudFNlcnZpY2UuaWQsIHtcbiAgICAgIGRlcmVnaXN0cmF0aW9uRGVsYXk6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIHBvcnQ6IDgwLFxuICAgICAgdGFyZ2V0czogW3NlcnZpY2VdLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMucmVxdWVzdHNQZXJUYXJnZXQpIHtcbiAgICAgIGlmICghdGhpcy5wYXJlbnRTZXJ2aWNlLnNjYWxhYmxlVGFza0NvdW50KSB7XG4gICAgICAgIHRocm93IEVycm9yKGBBdXRvIHNjYWxpbmcgdGFyZ2V0IGZvciB0aGUgc2VydmljZSAnJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9JyBoYXNuJ3QgYmVlbiBjb25maWd1cmVkLiBQbGVhc2UgdXNlIFNlcnZpY2UgY29uc3RydWN0IHRvIGNvbmZpZ3VyZSAnbWluVGFza0NvdW50JyBhbmQgJ21heFRhc2tDb3VudCcuYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnBhcmVudFNlcnZpY2Uuc2NhbGFibGVUYXNrQ291bnQuc2NhbGVPblJlcXVlc3RDb3VudChgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LXRhcmdldC1yZXF1ZXN0LWNvdW50LSR7dGhpcy5yZXF1ZXN0c1BlclRhcmdldH1gLCB7XG4gICAgICAgIHJlcXVlc3RzUGVyVGFyZ2V0OiB0aGlzLnJlcXVlc3RzUGVyVGFyZ2V0LFxuICAgICAgICB0YXJnZXRHcm91cCxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5wYXJlbnRTZXJ2aWNlLmVuYWJsZUF1dG9TY2FsaW5nUG9saWN5KCk7XG4gICAgfVxuICB9XG59XG4iXX0=