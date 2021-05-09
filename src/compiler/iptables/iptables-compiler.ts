/*
	Copyright 2021 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
	https://soltecsis.com
	info@soltecsis.com


	This file is part of FWCloud (https://fwcloud.net).

	FWCloud is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	FWCloud is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/

import { PolicyTypesMap } from '../../models/policy/PolicyType';
import { PolicyCompilerTools, ACTION, POLICY_TYPE, MARK_CHAIN } from '../PolicyCompilerTools';

export class IPTablesCompiler extends PolicyCompilerTools {
	
	constructor(ruleData: any) {
		super();

		this._ruleData = ruleData;
		this._policyType = ruleData.type;
		this._cmd = (this._policyType < PolicyTypesMap.get('IPv6:INPUT')) ? "$IPTABLES" : "$IP6TABLES"; // iptables command variable.
		this._cs = `${this._cmd} `; // Compilation string.
		this._afterLogAction = '';
		this._logChain = ''; 
		this._accChain = ''; 
		this._csEnd = ''; 
		this._stateful = ''; 
		this._table = ''; 
		this._action = '';
		this._comment = PolicyCompilerTools.ruleComment(this._ruleData);
	}


	private beforeCompilation(): void {
		if (!this.validPolicyType()) throw(new Error('Invalid policy type'));

		// The compilation process for IPv6 is the same that the one for IPv4.
		if (this._policyType >= PolicyTypesMap.get('IPv6:INPUT')) {
			this._policyType -= 60;
			this._ruleData.type -= 60;
			this._ruleData.ip_version = 6;
		} else this._ruleData.ip_version = 4;	

		if (this._policyType === PolicyTypesMap.get('IPv4:SNAT')) { // SNAT
			this._table = "-t nat";
			this._cs += this._table + ` -A POSTROUTING ${this._comment}`;
			this._action = PolicyCompilerTools.natAction(this._policyType, this._ruleData.positions[4].ipobjs, this._ruleData.positions[5].ipobjs, this._ruleData.ip_version);
		}
		else if (this._policyType === PolicyTypesMap.get('IPv4:DNAT')) { // DNAT
			this._table = "-t nat";
			this._cs += this._table + ` -A PREROUTING ${this._comment}`;
			this._action = PolicyCompilerTools.natAction(this._policyType, this._ruleData.positions[4].ipobjs, this._ruleData.positions[5].ipobjs, this._ruleData.ip_version);
		}
		else { // Filter policy
			if (!(this._ruleData.positions)
				|| !(this._ruleData.positions[0].ipobjs) || !(this._ruleData.positions[1].ipobjs) || !(this._ruleData.positions[2].ipobjs)
				|| (this._policyType === PolicyTypesMap.get('IPv4:FORWARD') && !(this._ruleData.positions[3].ipobjs))) {
				throw(new Error("Bad rule data"));
			}

			this._cs += `-A ${POLICY_TYPE[this._policyType]} ${this._comment}`;

			if (this._ruleData.special === 1) // Special rule for ESTABLISHED,RELATED packages.
				this._action = "ACCEPT";
			else if (this._ruleData.special === 2) // Special rule for catch-all.
				this._action = ACTION[this._ruleData.action];
			else {
				this._action = ACTION[this._ruleData.action];
				if (this._action === "ACCEPT") {
					if (this._ruleData.options & 0x0001) // Stateful rule.
						this._stateful = "-m conntrack --ctstate  NEW ";
					else if ((this._ruleData.firewall_options & 0x0001) && !(this._ruleData.options & 0x0002)) // Statefull firewall and this rule is not stateless.
						this._stateful = "-m conntrack --ctstate  NEW ";
					}
				else if (this._action === "ACCOUNTING") {
					this._accChain = "FWCRULE" + this._ruleData.id + ".ACC";
					this._action = this._accChain;
				}
			}

			// If log all rules option is enabled or log option for this rule is enabled.
			if ((this._ruleData.firewall_options & 0x0010) || (this._ruleData.options & 0x0004)) {
				this._logChain = "FWCRULE" + this._ruleData.id + ".LOG";
				if (!this._accChain) {
					this._afterLogAction = this._action;
					this._action = this._logChain;
				} else
					this._afterLogAction = "RETURN";
			}
		}

		if (parseInt(this._ruleData.special) === 1) // Special rule for ESTABLISHED,RELATED packages.
			this._csEnd = `-m conntrack --ctstate ESTABLISHED,RELATED -j ${this._action}\n`;
		else
			this._csEnd = `${this._stateful} -j ${this._action}\n`;
	}


	private natCheck(): void {
		if ((this._policyType === PolicyTypesMap.get('IPv4:SNAT') || this._policyType === PolicyTypesMap.get('IPv4:DNAT')) && this._ruleData.positions[5].ipobjs.length === 1) { // SNAT or DNAT
			const lines = this._cs.split('\n');
			this._cs = '';
			for(let i=0; i<lines.length; i++) {
				if (lines[i] === '') continue; // Ignore empty lines.
				if ((lines[i].match(/ -p tcp /g) || []).length > 1)
					this._cs += `${this._policyType===PolicyTypesMap.get('IPv4:SNAT') ? lines[i].replace(/ -j SNAT -p tcp /, ' -j SNAT ') : lines[i].replace(/ -j DNAT -p tcp /, ' -j DNAT ')}\n`;
				else if ((lines[i].match(/ -p udp /g) || []).length > 1)
					this._cs += `${this._policyType===PolicyTypesMap.get('IPv4:SNAT') ? lines[i].replace(/ -j SNAT -p udp /, ' -j SNAT ') : lines[i].replace(/ -j DNAT -p udp /, ' -j DNAT ')}\n`;
				else this._cs += `${lines[i]}\n`;
			}
		}
	}


	private addAccounting(): void {
		// Accounting, logging and marking is not allowed with SNAT and DNAT chains.
		if (this._accChain && this._policyType <= PolicyTypesMap.get('IPv4:FORWARD')) {
			this._cs = `${this._cmd} -N ${this._accChain}\n` +
				`${this._cmd} -A ${this._accChain} -j ${(this._logChain) ? this._logChain : "RETURN"}\n` +
				`${this._cs}`;
		}
	}


	private addLog(): void {
		// Accounting, logging and marking is not allowed with SNAT and DNAT chains.
		if (this._logChain && this._policyType <= PolicyTypesMap.get('IPv4:FORWARD')) {
			this._cs = `${this._cmd} -N ${this._logChain}\n` +
				`${this._cmd} -A ${this._logChain} -m limit --limit 60/minute -j LOG --log-level info --log-prefix "RULE ID ${this._ruleData.id} [${this._afterLogAction}] "\n` +
				`${this._cmd} -A ${this._logChain} -j ${this._afterLogAction}\n` +
				`${this._cs}`;
		}
	}


	private addMark(positionItems: string[][]): void {
		// Accounting, logging and marking is not allowed with SNAT and DNAT chains.
		if (parseInt(this._ruleData.mark_code) !== 0 && this._policyType <= PolicyTypesMap.get('IPv4:FORWARD')) {
			this._table = '-t mangle';

			this._action = `MARK --set-mark ${this._ruleData.mark_code}`;
			this._csEnd = `${this._stateful} -j ${this._action}\n`
			this._cs += PolicyCompilerTools.generateCompilationString(`${this._ruleData.id}-M1`, positionItems, `${this._cmd} -t mangle -A ${MARK_CHAIN[this._policyType]} `, this._csEnd, this._table, this._stateful, this._action, this._cmd);
			// Add the mark to the PREROUTING chain of the mangle table.
			if (this._policyType === PolicyTypesMap.get('IPv4:FORWARD')) {
				let str:string = PolicyCompilerTools.generateCompilationString(`${this._ruleData.id}-M1`, positionItems, `${this._cmd} -t mangle -A PREROUTING `, this._csEnd, this._table, this._stateful, this._action, this._cmd);
				str = str.replace(/-o \w+ /g, "")
				this._cs += str;
			}

			this._action = `CONNMARK --save-mark`;
			this._csEnd = `${this._stateful} -j ${this._action}\n`
			this._cs += PolicyCompilerTools.generateCompilationString(`${this._ruleData.id}-M2`, positionItems, `${this._cmd} -t mangle -A ${MARK_CHAIN[this._policyType]} `, this._csEnd, this._table, this._stateful, this._action, this._cmd);
			// Add the mark to the PREROUTING chain of the mangle table.
			if (this._policyType === PolicyTypesMap.get('IPv4:FORWARD')) {
				let str:string = PolicyCompilerTools.generateCompilationString(`${this._ruleData.id}-M2`, positionItems, `${this._cmd} -t mangle -A PREROUTING `, this._csEnd, this._table, this._stateful, this._action, this._cmd);
				str = str.replace(/-o \w+ /g, "")
				this._cs += str;
			}
		}
	}


  public ruleCompile(): string {
		// Prepare for compilation.
		this.beforeCompilation();

		// Pre-compile items of each rule position.
		const positionItems = PolicyCompilerTools.preCompile(this._ruleData);

		// Generate the compilation string.
		this._cs = PolicyCompilerTools.generateCompilationString(this._ruleData.id, positionItems, this._cs, this._csEnd, this._table, this._stateful, this._action, this._cmd);

		// If we are using UDP or TCP ports in translated service position for NAT rules, 
		// make sure that we have only one -p flag per line into the compilation string.
		this.natCheck();

		this.addAccounting();
		this.addLog();
		this.addMark(positionItems);
		
		return PolicyCompilerTools.afterCompilation(this._ruleData,this._cs);
	}
}