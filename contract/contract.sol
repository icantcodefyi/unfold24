// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract CustomToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isReentrant;
    bool private locked;

    address public minter;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        minter = msg.sender;
        mint(msg.sender, _initialSupply);
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter can mint");
        _;
    }

    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function transfer(address _to, uint256 _value) public noReentrant returns (bool success) {
        require(_to != address(0), "Cannot transfer to the zero address");
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public noReentrant returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public noReentrant returns (bool success) {
        require(_to != address(0), "Cannot transfer to the zero address");
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }

    function mint(address _to, uint256 _value) public onlyMinter noReentrant {
        require(_to != address(0), "Cannot mint to the zero address");
        totalSupply += _value;
        balanceOf[_to] += _value;
        emit Mint(_to, _value);
        emit Transfer(address(0), _to, _value);
    }

    function burn(uint256 _value) public noReentrant {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        totalSupply -= _value;
        emit Burn(msg.sender, _value);
        emit Transfer(msg.sender, address(0), _value);
    }

    function setMinter(address _newMinter) public onlyMinter {
        minter = _newMinter;
    }
}