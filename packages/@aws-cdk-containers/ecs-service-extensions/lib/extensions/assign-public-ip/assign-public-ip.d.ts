import * as ecs from '@aws-cdk/aws-ecs';
import * as route53 from '@aws-cdk/aws-route53';
import { Construct } from 'constructs';
import { Service } from '../../service';
import { ServiceExtension, ServiceBuild } from '../extension-interfaces';
export interface AssignPublicIpExtensionOptions {
    /**
     * Enable publishing task public IPs to a recordset in a Route 53 hosted zone.
     *
     * Note: If you want to change the DNS zone or record name, you will need to
     * remove this extension completely and then re-add it.
     */
    dns?: AssignPublicIpDnsOptions;
}
export interface AssignPublicIpDnsOptions {
    /**
     * A DNS Zone to expose task IPs in.
     */
    zone: route53.IHostedZone;
    /**
     * Name of the record to add to the zone and in which to add the task IP
     * addresses to.
     *
     * @example 'myservice'
     */
    recordName: string;
}
/**
 * Modifies the service to assign a public ip to each task and optionally
 * exposes public IPs in a Route 53 record set.
 *
 * Note: If you want to change the DNS zone or record name, you will need to
 * remove this extension completely and then re-add it.
 */
export declare class AssignPublicIpExtension extends ServiceExtension {
    dns?: AssignPublicIpDnsOptions;
    constructor(options?: AssignPublicIpExtensionOptions);
    private hasDns;
    prehook(service: Service, _scope: Construct): void;
    modifyServiceProps(props: ServiceBuild): ServiceBuild;
    useService(service: ecs.Ec2Service | ecs.FargateService): void;
}
