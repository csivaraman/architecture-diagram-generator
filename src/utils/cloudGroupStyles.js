export const GROUP_STYLES = {
    aws: {
        region: {
            borderColor: '#00A4A6',      // AWS teal
            borderStyle: 'dashed',
            borderWidth: 2,
            fillColor: 'rgba(0, 164, 166, 0.04)',
            labelColor: '#00A4A6',
            iconUrl: '/cloud-icons/aws/Region_32.svg',
            borderRadius: 4
        },
        vpc: {
            borderColor: '#8C4FFF',      // AWS purple
            borderStyle: 'solid',
            borderWidth: 2,
            fillColor: 'rgba(140, 79, 255, 0.04)',
            labelColor: '#8C4FFF',
            iconUrl: '/cloud-icons/aws/Virtual-private-cloud-VPC_32.svg',
            borderRadius: 4
        },
        subnet: {
            borderColor: '#00A4A6',
            borderStyle: 'solid',
            borderWidth: 1,
            fillColor: 'rgba(0, 164, 166, 0.08)',
            labelColor: '#147EBA',
            iconUrl: null,
            borderRadius: 2
        },
        az: {
            borderColor: '#147EBA',
            borderStyle: 'dashed',
            borderWidth: 1,
            fillColor: 'rgba(20, 126, 186, 0.04)',
            labelColor: '#147EBA',
            iconUrl: null,
            borderRadius: 2
        },
        security_group: {
            borderColor: '#DD344C',
            borderStyle: 'dashed',
            borderWidth: 1,
            fillColor: 'rgba(221, 52, 76, 0.04)',
            labelColor: '#DD344C',
            iconUrl: null,
            borderRadius: 2
        }
    },
    azure: {
        subscription: {
            borderColor: '#0078D4',
            borderStyle: 'solid',
            borderWidth: 2,
            fillColor: 'rgba(0, 120, 212, 0.04)',
            labelColor: '#0078D4',
            iconUrl: '/cloud-icons/azure/10002-icon-service-Subscriptions.svg',
            borderRadius: 4
        },
        resource_group: {
            borderColor: '#0078D4',
            borderStyle: 'dashed',
            borderWidth: 1,
            fillColor: 'rgba(0, 120, 212, 0.06)',
            labelColor: '#0078D4',
            iconUrl: '/cloud-icons/azure/10007-icon-service-Resource-Groups.svg',
            borderRadius: 4
        },
        vnet: {
            borderColor: '#0078D4',
            borderStyle: 'solid',
            borderWidth: 1,
            fillColor: 'rgba(0, 120, 212, 0.04)',
            labelColor: '#0078D4',
            iconUrl: '/cloud-icons/azure/10061-icon-service-Virtual-Networks.svg',
            borderRadius: 2
        }
    },
    gcp: {
        project: {
            borderColor: '#4285F4',
            borderStyle: 'solid',
            borderWidth: 2,
            fillColor: 'rgba(66, 133, 244, 0.04)',
            labelColor: '#4285F4',
            iconUrl: '/cloud-icons/gcp/ManagementTools-512-color.svg',
            borderRadius: 4
        },
        vpc: {
            borderColor: '#34A853',
            borderStyle: 'dashed',
            borderWidth: 1,
            fillColor: 'rgba(52, 168, 83, 0.04)',
            labelColor: '#34A853',
            iconUrl: '/cloud-icons/gcp/Networking-512-color-rgb.svg',
            borderRadius: 4
        },
        zone: {
            borderColor: '#FBBC04',
            borderStyle: 'dashed',
            borderWidth: 1,
            fillColor: 'rgba(251, 188, 4, 0.04)',
            labelColor: '#888',
            iconUrl: '/cloud-icons/gcp/Compute-512-color.svg',
            borderRadius: 2
        }
    }
};

export const getGroupStyle = (cloudProvider, groupType) => {
    return GROUP_STYLES[cloudProvider?.toLowerCase()]?.[groupType]
        || {
        borderColor: '#999', borderStyle: 'dashed', borderWidth: 1,
        fillColor: 'rgba(0,0,0,0.02)', labelColor: '#666', borderRadius: 4
    };
};
