
//Create New objet with data firewall
function firewalls_Data(data) {
    this.id = data.id;
    this.firewall = data.firewall;
    this.cluster = data.cluster;
    this.name = data.name;
    this.comment = data.comment;
    this.status_compiled = data.status_compiled;
    this.install_user = data.install_user;
    this.install_pass = data.install_pass;
    this.save_user_pass = data.save_user_pass;
    this.install_interface = data.install_interface;
    this.install_ipobj = data.install_ipobj;
    this.fwmaster = data.fwmaster;
    this.install_port = data.install_port;
    this.interface_name = data.interface_name;
    this.ip_name = data.ip_name;
    this.ip = data.ip;



}
;



//Export the object
module.exports = firewalls_Data;