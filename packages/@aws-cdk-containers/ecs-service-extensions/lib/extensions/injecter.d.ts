import * as ecs from '@aws-cdk/aws-ecs';
import * as sns from '@aws-cdk/aws-sns';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ServiceExtension } from './extension-interfaces';
/**
 * An interface that will be implemented by all the resources that can be published events or written data to.
 */
export interface Injectable {
    environmentVariables(): {
        [key: string]: string;
    };
}
/**
 * An interface that will be implemented by all the injectable resources that need to grant permissions to the task role.
 */
export interface GrantInjectable extends Injectable {
    grant(taskDefinition: ecs.TaskDefinition): void;
}
/**
 * The settings for the `InjectableTopic` class.
 */
export interface InjectableTopicProps {
    /**
     * The SNS Topic to publish events to.
     */
    readonly topic: sns.ITopic;
}
/**
 * The `InjectableTopic` class represents SNS Topic resource that can be published events to by the parent service.
 */
export declare class InjectableTopic implements GrantInjectable {
    readonly topic: sns.ITopic;
    constructor(props: InjectableTopicProps);
    grant(taskDefinition: ecs.TaskDefinition): void;
    environmentVariables(): {
        [key: string]: string;
    };
}
/**
 * The settings for the Injecter extension.
 */
export interface InjecterExtensionProps {
    /**
     * The list of injectable resources for this service.
     */
    readonly injectables: Injectable[];
}
/**
 * This extension accepts a list of `Injectable` resources that the parent service can publish events or write data to.
 * It sets up the corresponding permissions for the task role of the parent service.
 */
export declare class InjecterExtension extends ServiceExtension {
    private props;
    private environment;
    constructor(props: InjecterExtensionProps);
    prehook(service: Service, scope: Construct): void;
    /**
     * Add hooks to the main application extension so that it is modified to
     * add the injectable resource environment variables to the container environment.
     */
    addHooks(): void;
    /**
     * After the task definition has been created, this hook grants the required permissions to the task role for the
     * parent service.
     *
     * @param taskDefinition The created task definition
     */
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
}
