export const preGenericsInitialization: unique symbol = Symbol("FrameworkPluginsPreGenericsInitialization");
export const preInitialization: unique symbol = Symbol("FrameworkPluginsPreInitialization");
export const postInitialization: unique symbol = Symbol("FrameworkPluginsPostInitialization");

export const preLogin: unique symbol = Symbol("FrameworkPluginsPreLogin");
export const postLogin: unique symbol = Symbol("FrameworkPluginsPostLogin");

export const preSetupAmqp: unique symbol = Symbol("FrameworkPluginsPreSetupAmqp");
export const postSetupAmqp: unique symbol = Symbol("FrameworkPluginsPostSetupAmqp");
