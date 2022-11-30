"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
class MyCustomAutoscaling extends lib_1.ServiceExtension {
    constructor() {
        super('my-custom-autoscaling');
    }
    // This service modifies properties of the service prior
    // to construct creation.
    modifyServiceProps(props) {
        return {
            ...props,
            // Initially launch 10 copies of the service
            desiredCount: 10,
        };
    }
    // This hook utilizes the resulting service construct
    // once it is created
    useService(service) {
        const scalingTarget = service.autoScaleTaskCount({
            minCapacity: 5,
            maxCapacity: 20,
        });
        scalingTarget.scaleOnCpuUtilization('TargetCpuUtilization50', {
            targetUtilizationPercent: 50,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });
    }
}
const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-integ');
const environment = new lib_1.Environment(stack, 'production');
/** Name service */
const nameDescription = new lib_1.ServiceDescription();
nameDescription.add(new lib_1.Container({
    cpu: 1024,
    memoryMiB: 2048,
    trafficPort: 80,
    image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
    environment: {
        PORT: '80',
    },
}));
nameDescription.add(new MyCustomAutoscaling());
new lib_1.Service(stack, 'name', {
    environment: environment,
    serviceDescription: nameDescription,
});
/**
 * Expectation is that the user is able to implement their own extension
 * using the abstract class, and that it will function. This will help
 * catch breaking changes to extensions. (Might need to make this example
 * custom extension more complex eventually)
 */ 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuY3VzdG9tLXNlcnZpY2UtZXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW50ZWcuY3VzdG9tLXNlcnZpY2UtZXh0ZW5zaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsd0NBQXdDO0FBQ3hDLHFDQUFxQztBQUNyQyxnQ0FBNkc7QUFFN0csTUFBTSxtQkFBb0IsU0FBUSxzQkFBZ0I7SUFDaEQ7UUFDRSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsd0RBQXdEO0lBQ3hELHlCQUF5QjtJQUNsQixrQkFBa0IsQ0FBQyxLQUFtQjtRQUMzQyxPQUFPO1lBQ0wsR0FBRyxLQUFLO1lBRVIsNENBQTRDO1lBQzVDLFlBQVksRUFBRSxFQUFFO1NBQ0QsQ0FBQztJQUNwQixDQUFDO0lBRUQscURBQXFEO0lBQ3JELHFCQUFxQjtJQUNkLFVBQVUsQ0FBQyxPQUE0QztRQUM1RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUM7WUFDL0MsV0FBVyxFQUFFLENBQUM7WUFDZCxXQUFXLEVBQUUsRUFBRTtTQUNoQixDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLEVBQUU7WUFDNUQsd0JBQXdCLEVBQUUsRUFBRTtZQUM1QixlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3pDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUMzQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBRWxELE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQVcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFFekQsbUJBQW1CO0FBQ25CLE1BQU0sZUFBZSxHQUFHLElBQUksd0JBQWtCLEVBQUUsQ0FBQztBQUNqRCxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksZUFBUyxDQUFDO0lBQ2hDLEdBQUcsRUFBRSxJQUFJO0lBQ1QsU0FBUyxFQUFFLElBQUk7SUFDZixXQUFXLEVBQUUsRUFBRTtJQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztJQUN6RCxXQUFXLEVBQUU7UUFDWCxJQUFJLEVBQUUsSUFBSTtLQUNYO0NBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO0FBRS9DLElBQUksYUFBTyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUU7SUFDekIsV0FBVyxFQUFFLFdBQVc7SUFDeEIsa0JBQWtCLEVBQUUsZUFBZTtDQUNwQyxDQUFDLENBQUM7QUFFSDs7Ozs7R0FLRyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGVjcyBmcm9tICdAYXdzLWNkay9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IENvbnRhaW5lciwgRW52aXJvbm1lbnQsIFNlcnZpY2UsIFNlcnZpY2VCdWlsZCwgU2VydmljZURlc2NyaXB0aW9uLCBTZXJ2aWNlRXh0ZW5zaW9uIH0gZnJvbSAnLi4vbGliJztcblxuY2xhc3MgTXlDdXN0b21BdXRvc2NhbGluZyBleHRlbmRzIFNlcnZpY2VFeHRlbnNpb24ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcignbXktY3VzdG9tLWF1dG9zY2FsaW5nJyk7XG4gIH1cblxuICAvLyBUaGlzIHNlcnZpY2UgbW9kaWZpZXMgcHJvcGVydGllcyBvZiB0aGUgc2VydmljZSBwcmlvclxuICAvLyB0byBjb25zdHJ1Y3QgY3JlYXRpb24uXG4gIHB1YmxpYyBtb2RpZnlTZXJ2aWNlUHJvcHMocHJvcHM6IFNlcnZpY2VCdWlsZCkge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5wcm9wcyxcblxuICAgICAgLy8gSW5pdGlhbGx5IGxhdW5jaCAxMCBjb3BpZXMgb2YgdGhlIHNlcnZpY2VcbiAgICAgIGRlc2lyZWRDb3VudDogMTAsXG4gICAgfSBhcyBTZXJ2aWNlQnVpbGQ7XG4gIH1cblxuICAvLyBUaGlzIGhvb2sgdXRpbGl6ZXMgdGhlIHJlc3VsdGluZyBzZXJ2aWNlIGNvbnN0cnVjdFxuICAvLyBvbmNlIGl0IGlzIGNyZWF0ZWRcbiAgcHVibGljIHVzZVNlcnZpY2Uoc2VydmljZTogZWNzLkVjMlNlcnZpY2UgfCBlY3MuRmFyZ2F0ZVNlcnZpY2UpIHtcbiAgICBjb25zdCBzY2FsaW5nVGFyZ2V0ID0gc2VydmljZS5hdXRvU2NhbGVUYXNrQ291bnQoe1xuICAgICAgbWluQ2FwYWNpdHk6IDUsIC8vIE1pbiA1IHRhc2tzXG4gICAgICBtYXhDYXBhY2l0eTogMjAsIC8vIE1heCAyMCB0YXNrc1xuICAgIH0pO1xuXG4gICAgc2NhbGluZ1RhcmdldC5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oJ1RhcmdldENwdVV0aWxpemF0aW9uNTAnLCB7XG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDUwLFxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICBzY2FsZU91dENvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbmNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjayhhcHAsICdhd3MtZWNzLWludGVnJyk7XG5cbmNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuXG4vKiogTmFtZSBzZXJ2aWNlICovXG5jb25zdCBuYW1lRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5uYW1lRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICBjcHU6IDEwMjQsXG4gIG1lbW9yeU1pQjogMjA0OCxcbiAgdHJhZmZpY1BvcnQ6IDgwLFxuICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gIGVudmlyb25tZW50OiB7XG4gICAgUE9SVDogJzgwJyxcbiAgfSxcbn0pKTtcbm5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IE15Q3VzdG9tQXV0b3NjYWxpbmcoKSk7XG5cbm5ldyBTZXJ2aWNlKHN0YWNrLCAnbmFtZScsIHtcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICBzZXJ2aWNlRGVzY3JpcHRpb246IG5hbWVEZXNjcmlwdGlvbixcbn0pO1xuXG4vKipcbiAqIEV4cGVjdGF0aW9uIGlzIHRoYXQgdGhlIHVzZXIgaXMgYWJsZSB0byBpbXBsZW1lbnQgdGhlaXIgb3duIGV4dGVuc2lvblxuICogdXNpbmcgdGhlIGFic3RyYWN0IGNsYXNzLCBhbmQgdGhhdCBpdCB3aWxsIGZ1bmN0aW9uLiBUaGlzIHdpbGwgaGVscFxuICogY2F0Y2ggYnJlYWtpbmcgY2hhbmdlcyB0byBleHRlbnNpb25zLiAoTWlnaHQgbmVlZCB0byBtYWtlIHRoaXMgZXhhbXBsZVxuICogY3VzdG9tIGV4dGVuc2lvbiBtb3JlIGNvbXBsZXggZXZlbnR1YWxseSlcbiAqLyJdfQ==