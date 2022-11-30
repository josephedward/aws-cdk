import * as ecs from '@aws-cdk/aws-ecs';
import * as route53 from '@aws-cdk/aws-route53';
import { Construct } from 'constructs';
export interface TaskRecordManagerProps {
    service: ecs.Ec2Service | ecs.FargateService;
    dnsZone: route53.IHostedZone;
    dnsRecordName: string;
}
/**
 * An event-driven serverless app to maintain a list of public ips in a Route 53
 * hosted zone.
 */
export declare class TaskRecordManager extends Construct {
    constructor(scope: Construct, id: string, props: TaskRecordManagerProps);
}
